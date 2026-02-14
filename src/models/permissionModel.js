// models/permissionModel.js
const { query } = require("../config/db");

// 1. 分配单个权限（先查是否已分配，避免重复插入）
// 1. 分配单个权限（先查是否已分配，避免重复插入 + 新增权限编码校验）
exports.assignPermission = (userId, permCode, callback) => {
  // 第一步：校验权限编码是否存在于permissions字典表
  const checkPermExistSql = "SELECT * FROM permissions WHERE code = ?";
  query(checkPermExistSql, [permCode], (existErr, existResult) => {
    if (existErr) {
      console.error("检查权限编码是否存在失败：", existErr);
      return callback(existErr, null);
    }
    // 权限编码不存在，直接返回错误
    if (existResult.length === 0) {
      const err = new Error(
        `权限编码 ${permCode} 不存在, 请先在permissions表中添加`,
      );
      console.error(err.message);
      return callback(err, null);
    }

    // 第二步：检查该用户是否已拥有此权限
    const checkSql =
      "SELECT * FROM user_permissions WHERE user_id = ? AND permission_code = ?";
    query(checkSql, [userId, permCode], (checkErr, checkResult) => {
      if (checkErr) {
        console.error("检查权限重复失败：", checkErr);
        return callback(checkErr, null);
      }

      // 已分配则直接返回成功
      if (checkResult.length > 0) {
        return callback(null, {
          affectedRows: 0,
          message: "该用户已拥有此权限，无需重复分配",
        });
      }

      // 未分配则插入关联关系
      const insertSql =
        "INSERT INTO user_permissions (user_id, permission_code) VALUES (?, ?)";
      query(insertSql, [userId, permCode], (insertErr, insertResult) => {
        if (insertErr) {
          console.error("分配权限SQL失败：", insertErr);
          return callback(insertErr, null);
        }
        callback(null, insertResult);
      });
    });
  });
};

// 2. 回收单个权限（核心修复：正确的DELETE语法）
exports.revokePermission = (userId, permCode, callback) => {
  // ✅ 正确的DELETE语句：只筛选user_id和permission_code
  const deleteSql =
    "DELETE FROM user_permissions WHERE user_id = ? AND permission_code = ?";

  query(deleteSql, [userId, permCode], (deleteErr, deleteResult) => {
    if (deleteErr) {
      console.error("回收权限SQL失败：", deleteErr);
      return callback(deleteErr, null);
    }

    // 无数据被删除时返回友好提示
    if (deleteResult.affectedRows === 0) {
      return callback(new Error("该用户未拥有此权限，无需回收"), null);
    }

    callback(null, deleteResult);
  });
};

// 3. 查询用户已拥有的权限（关联字典表返回完整信息）
exports.getUserPermissions = (userId, callback) => {
  const sql = `
    SELECT permission_code 
    FROM user_permissions 
    WHERE user_id = ?
  `;
  query(sql, [userId], (err, results) => {
    if (err) {
      console.error("查询权限失败：", err);
      return callback(err, []);
    }

    // 提取 permission_code 组成纯字符串数组
    const permissions = results.map((item) => item.permission_code || '');
    // 过滤空值（避免数据库中permission_code为null的情况）
    const validPermissions = permissions.filter(code => code);

    // 返回纯字符串数组
    callback(null, validPermissions);
  });
};

// 4. 查询所有权限（从字典表查，最准确）
exports.getAllPermissions = (callback) => {
  const sql = "SELECT code, name FROM permissions ORDER BY code";
  query(sql, (err, result) => {
    if (err) {
      console.error("查询所有权限失败：", err);
      return callback(err, null);
    }

    callback(null, result);
  });
};

// 5. 批量分配权限（可选，批量插入）
// 5. 批量分配权限（新增权限编码合法性校验）
exports.batchAssignPermissions = (userId, permCodes, callback) => {
  if (!Array.isArray(permCodes) || permCodes.length === 0) {
    return callback(new Error("权限编码必须是非空数组"), null);
  }

  // 第一步：校验所有权限编码是否存在
  const placeholders = permCodes.map(() => "?").join(",");
  const checkSql = `SELECT code FROM permissions WHERE code IN (${placeholders})`;
  query(checkSql, permCodes, (checkErr, checkResult) => {
    if (checkErr) {
      console.error("批量检查权限编码失败：", checkErr);
      return callback(checkErr, null);
    }

    // 提取有效权限编码
    const validPermCodes = checkResult.map((item) => item.code);
    // 找出无效权限编码
    const invalidPermCodes = permCodes.filter(
      (code) => !validPermCodes.includes(code),
    );
    if (invalidPermCodes.length > 0) {
      const err = new Error(
        `以下权限编码不存在：${invalidPermCodes.join(", ")}`,
      );
      console.error(err.message);
      return callback(err, null);
    }

    // 第二步：过滤用户已拥有的权限（避免重复插入）
    const userPermPlaceholders = validPermCodes.map(() => "?").join(",");
    const checkUserPermSql = `SELECT permission_code FROM user_permissions WHERE user_id = ? AND permission_code IN (${userPermPlaceholders})`;
    query(
      checkUserPermSql,
      [userId, ...validPermCodes],
      (userPermErr, userPermResult) => {
        if (userPermErr) {
          console.error("批量检查用户已有权限失败：", userPermErr);
          return callback(userPermErr, null);
        }

        // 提取用户已拥有的权限编码
        const userHadPermCodes = userPermResult.map(
          (item) => item.permission_code,
        );
        // 仅插入用户未拥有的权限
        const needAssignCodes = validPermCodes.filter(
          (code) => !userHadPermCodes.includes(code),
        );
        if (needAssignCodes.length === 0) {
          return callback(null, {
            affectedRows: 0,
            message: "该用户已拥有所有选中的权限，无需重复分配",
          });
        }

        // 第三步：批量插入
        const insertPlaceholders = needAssignCodes
          .map(() => "(?, ?)")
          .join(",");
        const params = [];
        needAssignCodes.forEach((code) => {
          params.push(userId, code);
        });

        const sql = `INSERT INTO user_permissions (user_id, permission_code) VALUES ${insertPlaceholders}`;
        query(sql, params, (err, result) => {
          if (err) {
            console.error("批量分配权限失败：", err);
            return callback(err, null);
          }
          callback(null, result);
        });
      },
    );
  });
};

// 6. 按模块分组查询所有权限（核心：根据code前缀分组）
exports.getAllPermissionsGrouped = (callback) => {
  // 先查询所有权限
  const sql = "SELECT code, name FROM permissions ORDER BY code";
  query(sql, (err, permissions) => {
    if (err) {
      console.error("查询权限失败：", err);
      return callback(err, null);
    }

    // 按模块分组（根据code前缀映射中文模块名）
    const grouped = {};
    // 模块名映射表（和你的侧边栏/数据库权限编码对应）
    const moduleMap = {
      user: "用户模块",
      article: "文章模块",
      category: "分类模块",
      tag: "标签模块",
      comment: "评论模块",
      media: "媒体模块",
      setting: "系统模块",
      log: "日志模块",
      permission: "权限管理模块",
    };

    permissions.forEach((perm) => {
      // 提取权限编码的模块前缀（如 user:list → user）
      const modulePrefix = perm.code.split(":")[0];
      // 获取中文分组名，默认"其他模块"
      const groupName = moduleMap[modulePrefix] || "其他模块";

      // 分组存储
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(perm);
    });

    // 转换为前端易处理的数组格式
    const result = Object.entries(grouped).map(([group, perms]) => ({
      group,
      permissions: perms,
    }));
    callback(null, result);
  });
};
