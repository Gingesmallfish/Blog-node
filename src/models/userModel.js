const conn = require("../config/db");
const bcrypt = require("bcryptjs");
const permissionModel = require("./permissionModel");

// ========== 移除所有重复定义，保留一份完整逻辑 ==========



// 3. 更新个人网站
exports.updateUserWebsite = (userId, website, callback) => {
  const sql = "UPDATE users SET website = ? WHERE id = ?";
  conn.query(sql, [website, userId], (err, result) => {
    if (err) {
      console.log("模型层：更新用户网站失败", err);
      return callback(err, null);
    }
    if (result.affectedRows === 0) {
      return callback(new Error("用户不存在"), null);
    }
    callback(null, result);
  });
};

// 5. 更新用户最后登录时间（补充实现）
exports.updateLastLogin = (userId, callback) => {
  const sql = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?";
  conn.query(sql, [userId], (err, result) => {
    if (err) {
      console.log("模型层：更新最后登录时间失败", err);
      return callback(err, null);
    }
    callback(null, result);
  });
};

// 6. 查询用户状态
exports.getUserStatus = (userId, callback) => {
  const sql = "SELECT status FROM users WHERE id = ?";
  conn.query(sql, [userId], (err, result) => {
    if (err) {
      console.log("模型层：查询用户状态失败", err);
      return callback(err, null);
    }
    callback(null, result[0]?.status);
  });
};



// ========== 核心修复：查询用户信息时关联权限 ==========
exports.getUserInfoById = (userId, callback) => {
  const userSql =
    "SELECT id, username, role, status, password_hash FROM users WHERE id = ? LIMIT 1";
  const queryId = parseInt(userId);

  if (isNaN(queryId) || queryId < 1) {
    return callback(new Error(`用户ID非法 → ${userId}`), null);
  }

  conn.query(userSql, [queryId], (err, results) => {
    console.log("模型层：查询用户信息成功", results);
    if (err) return callback(err, null);
    if (results.length === 0) return callback(null, null);

    const user = results[0];
    console.log("模型层：查询用户信息成功", user);

    // ✅ 使用正确的字段名
    if (!user.password_hash) {
      return callback(new Error("用户密码不存在"), null);
    }

    permissionModel.getUserPermissions(queryId, (permErr, permissions) => {
      if (permErr) {
        user.permissions = [];
        return callback(null, user);
      }
      user.permissions = permissions || [];
      callback(null, user);
    });
  });
};


exports.getUsersByPage = (offset, pageSize, callback) => {
  // 错误写法：const sql = "select * from users limit ? offset ?;";
  // 正确写法：LIMIT 偏移量, 条数
  const sql = "select * from users limit ?, ?;"; 
  // 参数顺序必须是 [offset, pageSize]
  conn.query(sql, [offset, pageSize], (err, result) => {
    if (err) {
      console.log("模型层：分页查询用户失败", err);
      return callback(err, null);
    }
    // 补充权限字段
    exports.addPermToUserList(result, (permErr, userListWithPerms) => {
      callback(permErr, userListWithPerms || result);
    });
  });
};

exports.getUserTotal = (callback) => {
  const sql = "SELECT COUNT(*) AS total FROM users";
  conn.query(sql, (err, result) => {
    if (err) {
      console.error("模型层：查询用户总数失败", err);
      return callback(err, null);
    }

    // ✅ 返回标准化数据
    callback(null, result);
  });
};
// 8. 查询所有用户（关联权限，只保留一份）
exports.getAllUsers = (callback) => {
  const sql =
    "SELECT id,username,email,role,status,created_at FROM users ORDER BY id DESC";
  conn.query(sql, [], (err, result) => {
    if (err) {
      console.log("模型层：查询所有用户失败", err);
      return callback(err, null);
    }
    // 补充permissions字段
    exports.addPermToUserList(result, (permErr, userListWithPerms) => {
      callback(permErr, userListWithPerms || result);
    });
  });
};

// 根据ID删除用户
exports.deleteUserById = (userId, callback) => {
  const sql = "DELETE FROM users WHERE id = ?";
  conn.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("删除用户失败（数据库）：", err);
      return callback(err, null);
    }
    if (result.affectedRows === 0) {
      return callback(new Error("用户ID不存在，删除失败"), null);
    }
    callback(null, { msg: "用户删除成功", affectedRows: result.affectedRows });
  });
};

// ========== 移除重复的updateUserRole，保留完整逻辑 ==========
exports.updateUserRole = (userId, newRole, callback) => {
  // 1. 校验角色合法性
  const validRoles = ["visitor", "user", "author", "admin"];
  if (!validRoles.includes(newRole)) {
    const err = new Error(`角色非法！仅支持：${validRoles.join("/")}`);
    return callback(err, null);
  }
  // 2. 校验用户ID合法性
  const queryId = parseInt(userId);
  if (isNaN(queryId) || queryId < 1) {
    const err = new Error(`用户ID非法，必须为正整数`);
    return callback(err, null);
  }
  // 3. 执行SQL更新
  const sql = `
        UPDATE users
        SET role       = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
  conn.query(sql, [newRole, queryId], (err, result) => {
    if (err) {
      console.error("更新用户角色失败：", err);
      return callback(err, null);
    }
    if (result.affectedRows === 0) {
      const err = new Error(`更新失败！用户ID=${queryId} 不存在或角色未变更`);
      return callback(err, null);
    }
    callback(null, {
      userId: queryId,
      newRole: newRole,
      msg: `用户ID=${queryId} 角色已更新为：${newRole}`,
    });
  });
};

// 更新用户信息
exports.updateUserInfoById = (id, username, email, callback) => {
  const sql = "UPDATE users SET username = ?, email = ? WHERE id = ?";
  conn.query(sql, [username, email, id], (err, result) => {
    if (err) {
      console.error("更新用户信息失败：", err);
      return callback(err, null);
    }
    if (result.affectedRows === 0) {
      const err = new Error(`更新失败！用户ID=${id} 不存在或信息未变更`);
      return callback(err, null);
    }
    callback(null, {
      id: id,
      username: username,
      email: email,
      msg: `用户ID=${id} 信息已更新`,
      affectedRows: result.affectedRows, // 补充affectedRows，供服务层判断
    });
  });
};

// 按条件查询用户列表
exports.getUsersByCondition = (params, callback) => {
  const {
    keyword = "", // 关键字
    status = "", // 状态
    role = "", // 角色
    page = 1,
    pageSize = 10,
  } = params;
  const pageNum = parseInt(page) || 1;
  const sizeNum = parseInt(pageSize) || 10;
  const offset = (pageNum - 1) * sizeNum;

  let whereSql = "WHERE 1=1";
  const queryParams = [];

  if (keyword) {
    whereSql += " AND (username LIKE ? OR email LIKE ?)";
    queryParams.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    whereSql += " AND status = ?";
    queryParams.push(status);
  }
  if (role) {
    whereSql += " AND role = ?";
    queryParams.push(role);
  }

  // 查询总条数
  const countSql = `SELECT COUNT(*) AS total FROM users ${whereSql}`;
  conn.query(countSql, queryParams, (countErr, countResult) => {
    if (countErr) return callback(countErr, null);
    const total = countResult[0].total;

    // 查询当前页数据
    const listSql = `
            SELECT * FROM users ${whereSql}
            ORDER BY created_at DESC
            LIMIT ?, ?
        `;
    const listParams = [...queryParams, offset, sizeNum];
    conn.query(listSql, listParams, (listErr, list) => {
      if (listErr) return callback(listErr, null);

      // 补充权限字段
      exports.addPermToUserList(list, (permErr, listWithPerms) => {
        callback(null, {
          list: permErr ? list : listWithPerms,
          total,
          page: pageNum,
          pageSize: sizeNum,
        });
      });
    });
  });
};




// 校验角色是否合法
exports.isRoleValid = (role) => {
  return ["visitor", "user", "author", "admin"].includes(role);
};

// ========== 权限关联工具方法 ==========
exports.addPermToSingleUser = (user, callback) => {
  if (!user || !user.id) {
    return callback(new Error("用户ID不能为空"), { ...user, permissions: [] });
  }
  permissionModel.getUserPermissions(user.id, (permErr, permissions) => {
    if (permErr) {
      console.error(`【模型层】查询用户${user.id}权限失败：`, permErr);
      return callback(null, { ...user, permissions: [] });
    }
    callback(null, { ...user, permissions: permissions || [] });
  });
};

// 批量给用户列表补充权限
exports.addPermToUserList = (userList, callback) => {
  if (!Array.isArray(userList) || userList.length === 0) {
    return callback(null, []);
  }

  let completed = 0;
  const resultList = [];
  const total = userList.length;

  userList.forEach((user) => {
    exports.addPermToSingleUser(user, (err, userWithPerms) => {
      completed++;
      if (err) {
        console.error(`【模型层】给用户${user.id}补充权限失败：`, err);
        resultList.push({ ...user, permissions: [] });
      } else {
        resultList.push(userWithPerms);
      }
      if (completed === total) {
        callback(null, resultList);
      }
    });
  });
};

// ========== 其他用户相关服务方法（如修改密码、分配角色等） ==========
exports.updateUserPassword = (userId, newPassword, callback) => {
  const queryId = parseInt(userId);
  if (isNaN(queryId) || queryId < 1) {
    return callback(new Error("用户ID非法"), null);
  }

  // 加密新密码
  bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
    if (err) {
      return callback(err, null);
    }

    const sql = "UPDATE users SET password_hash = ? WHERE id = ?";
    conn.query(sql, [hashedPassword, queryId], (err, result) => {
      if (err) {
        return callback(err, null);
      }
      if (result.affectedRows === 0) {
        return callback(new Error("用户不存在"), null);
      }
      callback(null, { userId: queryId });
    });
  });
};



// 根据ID查询用户
exports.getUserById = (userId, callback) => {
  const sql = "SELECT * FROM users WHERE id = ?";
  conn.query(sql, [userId], (err, rows) => {
    if (err) {
      return callback(err, null); // 异常传递给回调
    }
    callback(null, rows[0] || null); // 成功返回数据
  });
};

// 更新用户核心信息
exports.editUserCoreInfo = (params, callback) => {
  const { userId, username, email, role, status, email_verified } = params;
  const sql = `
    UPDATE users 
    SET username = ?, email = ?, role = ?, status = ?, email_verified = ?
    WHERE id = ?
  `;
  conn.query(sql, [username, email, role, status, email_verified, userId], (err, result) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
};
/**
 * 修改用户个人信息，个人网站
 * @param {*} params 
 * @param {*} callback 
 */
exports.editUserPersonalInfo = (params, callback) => {
  const { userId, bio, website } = params;
  
  let updateFields = [];
  let sqlParams = [];
  
  if (bio !== undefined) {
    updateFields.push("bio = ?");
    sqlParams.push(bio);
  }
  if (website !== undefined) {
    updateFields.push("website = ?");
    sqlParams.push(website);
  }

  const sql = `
    UPDATE users 
    SET ${updateFields.join(", ")}
    WHERE id = ?
  `;
  sqlParams.push(userId);
  
  conn.query(sql, sqlParams, (err, result) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
};



