const userModel = require("../models/userModel");
const permissionModel = require("../models/permissionModel");
const bcrypt = require("bcryptjs");


/**
 * 网站URL验证和更新
 * @param {number} userId  用户ID
 * @param {string} website 个人网站URL
 * @param {function} callback  回调函数，参数格式：callback(err)
 * @returns 
 */
exports.updateUserWebsite = (userId, website, callback) => {
  if (!userId || isNaN(Number(userId))) {
    return callback(new Error("用户ID必须是有效数字"));
  }
  if (website && !/^https?:\/\/.+/.test(website)) {
    return callback(new Error("个人网站URL格式错误（需以http/https开头）"));
  }
  userModel.updateUserWebsite(userId, website, (err) => {
    if (err) {
      console.log("服务层：更新个人网站失败", err);
      return callback(err);
    }
    callback(null);
  });
};



/**
 * 查询分页用户列表 （增加参数校验）
 * @param {*} page 页码
 * @param {*} pageSize 每页条数
 * @param {*} callback  回调函数，参数格式：callback(err, userList, total)，其中userList为用户列表数组，total为用户总数
 */
exports.getUserList = (page, pageSize, callback) => {
  // 正确计算偏移量：(页码 - 1) * 每页条数
  const offset = (page - 1) * pageSize;
  userModel.getUsersByPage(offset, pageSize, (err, userList) => {
    if (err) {
      return callback(new Error("查询用户列表失败"));
    }
    userModel.getUserTotal((err, total) => {
      if (err) {
        return callback(new Error("查询用户总数失败"));
      }
      callback(null, userList, total[0].total);
    });
  });
};

/**
 * 退出登陆
 * @param {string} token JWT令牌
 * @param {string} session  用户会话对象（可选，取决于你的会话管理方式）
 * @param {Array} callback 回调函数，参数格式：callback(err)，其中err为错误对象或null
 */
exports.logoutUser = (token, session, callback) => {
  global.jwtBlacklist.add(token);
  if (session && typeof session.destroy === "function") {
    session.destroy((err) => {
      if (err) {
        console.error("Session销毁失败：", err);
        return callback(null);
      }
      callback(null);
    });
  } else {
    callback(null);
  }
};

// 删除用户
exports.removeUser = (userId, callback) => {
  if (!userId || isNaN(Number(userId)) || Number(userId) <= 0) {
    return callback(new Error("用户ID不合法，必须为正整数"));
  }
  userModel.deleteUserById(Number(userId), (err) => {
    if (err) return callback(new Error("用户删除失败：" + err.message));
    callback(null);
  });
};



// ========== 修复：更新用户信息的回调判断 ==========
exports.updateUserInfo = (id, username, email, callback) => {
  if (!id || isNaN(Number(id))) {
    return callback(new Error("用户ID必须是有效数字"));
  }
  userModel.updateUserInfoById(id, username, email, (err, result) => {
    if (err) return callback(new Error("更新信息失败：" + err.message));
    // 模型层已返回affectedRows，正确判断
    if (result.affectedRows === 0)
      return callback(new Error(`用户ID ${id} 不存在`));
    callback(null, { username, email });
  });
};

/**
 * 查询用户列表（增加参数校验）
 * @param {*} params  查询参数对象，包含：page（页码）、pageSize（每页条数）、keyword（搜索关键词，可选）
 * @param {*} callback  回调函数，参数格式：callback(err, data)，其中data为查询结果数组
 */
exports.getUserListService = (params, callback) => {
  userModel.getUsersByCondition(params, (err, data) => {
    if (err) {
      return callback(`用户数据查询失败：${err.message}`, null);
    }
    callback(null, data);
  });
};

/**
 * 分配用户角色
 * @param {*} userId 用户id
 * @param {*} newRole  新角色（visitor/user/author/admin）
 * @param {*} callback  回调函数，参数格式：callback(err, result)，其中result为分配结果
 * @returns 
 */
exports.assignUserRole = (userId, newRole, callback) => {
  if (!userModel.isRoleValid(newRole)) {
    return callback(
      new Error("角色类型无效，仅支持：visitor/user/author/admin"),
    );
  }
  userModel.updateUserRole(userId, newRole, (err, result) => {
    if (err) return callback(new Error("角色分配失败：" + err.message));
    if (!result) {
      // 模型层返回null代表失败
      return callback(new Error("用户ID不存在，角色修改失败"));
    }
    callback(null, {
      success: true,
      userId,
      newRole,
    });
  });
};

/**
 * 批量分配权限（核心修复：参数校验+批量插入优化）
 * @param {*} userId  用户ID
 * @param {*} callback  回调函数，参数格式：callback(err, result)，其中result为分配结果
 */
exports.getUserPermissions = (userId, callback) => {
  permissionModel.getUserPermissions(userId, (err, permissions) => {
    if (err) {
      console.log("查询权限失败", err);
      return callback(err, []);
    }
    const permArray = Array.isArray(permissions) ? permissions : [];
    callback(null, permArray); // permissions是['user:list']格式的数组
  });
};

/**
 * 修改密码
 * @param {*} userId 用户的id
 * @param {*} oldPassword  用户输入的旧密码
 * @param {*} newPassword  用户输入的新密码
 * @param {*} callback  回调函数，参数格式：callback(err, result)，其中result为更新结果
 */
exports.changePassword = (userId, oldPassword, newPassword, callback) => {
  // 1. 查询用户信息（注意：确保能拿到 password 字段）
  userModel.getUserInfoById(userId, (err, user) => {
    if (err || !user) {
      return callback(new Error("用户不存在或获取失败"), null);
    }

    // ✅ 检查 user.password 是否存在
    if (!user.password_hash) {
      return callback(new Error("用户密码不存在"), null);
    }

    // 2. 验证旧密码
    const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!isMatch) {
      return callback(new Error("旧密码错误"), null);
    }

    // 3. 更新新密码
    userModel.updateUserPassword(userId, newPassword, (err, result) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, result);
    });
  });
};



// 1. 重命名：updateUserInfo → editUserCoreInfo（核心信息编辑）
exports.editUserCoreInfo = (params, callback) => {
  const { userId, username, email, role, status, email_verified } = params;

  // 基础参数校验
  if (!userId || !username || !email || !role || !status || email_verified === undefined) {
    return callback(new Error("用户名、邮箱、角色、状态、邮箱验证状态均为必填项"), null);
  }

  // 数据类型校验
  const queryId = parseInt(userId);
  if (isNaN(queryId) || queryId < 1) {
    return callback(new Error("用户ID必须为大于0的整数"), null);
  }

  // 枚举值校验
  const validRoles = ["visitor", "user", "author", "admin"];
  if (!validRoles.includes(role)) {
    return callback(new Error(`角色非法！仅支持：${validRoles.join("/")}`), null);
  }
  const validStatus = ["active", "inactive", "banned"];
  if (!validStatus.includes(status)) {
    return callback(new Error(`状态非法！仅支持：${validStatus.join("/")}`), null);
  }
  const verified = parseInt(email_verified);
  if (![0, 1].includes(verified)) {
    return callback(new Error("邮箱验证状态仅支持 1（已验证）/ 0（未验证）"), null);
  }

  // 异步校验：查询用户是否存在
  userModel.getUserById(queryId, (err, user) => {
    if (err) {
      return callback(new Error("查询用户失败：" + err.message), null);
    }
    if (!user) {
      return callback(new Error("用户不存在"), null);
    }

    // 调用Model层（同步重命名后的函数）
    userModel.editUserCoreInfo({
      userId: queryId,
      username,
      email,
      role,
      status,
      email_verified: verified
    }, (err, result) => {
      if (err) {
        return callback(new Error("更新用户核心信息失败：" + err.message), null);
      }
      if (result.affectedRows === 0) {
        return callback(new Error("用户核心信息未变更（提交值与原有值一致）"), null);
      }

      callback(null, {
        userId: queryId,
        affectedRows: result.affectedRows,
        message: "用户核心信息更新成功"
      });
    });
  });
};

// 2. 重命名：updateUserProfile → editUserPersonalInfo（个人信息编辑）
exports.editUserPersonalInfo = (params, callback) => {
  const { userId, bio, website } = params;

  // 校验用户ID
  const queryId = parseInt(userId);
  if (isNaN(queryId) || queryId < 1) {
    return callback(new Error("用户ID必须为大于0的整数"), null);
  }

  // 校验用户是否存在
  userModel.getUserById(queryId, (err, user) => {
    if (err) {
      return callback(new Error("查询用户失败：" + err.message), null);
    }
    if (!user) {
      return callback(new Error("用户不存在"), null);
    }

    // 校验更新字段
    if (bio === undefined && website === undefined) {
      return callback(new Error("未传入需要更新的个人信息字段（仅支持简介、网站）"), null);
    }

    // 调用Model层（同步重命名后的函数）
    userModel.editUserPersonalInfo({
      userId: queryId,
      bio,
      website
    }, (err, result) => {
      if (err) {
        return callback(new Error("更新个人信息失败：" + err.message), null);
      }
      if (result.affectedRows === 0) {
        return callback(new Error("个人信息未变更"), null);
      }

      callback(null, {
        userId: queryId,
        affectedRows: result.affectedRows,
        message: "用户简介/网站更新成功"
      });
    });
  });
};

