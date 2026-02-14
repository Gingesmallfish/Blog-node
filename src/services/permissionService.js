const permissionModel = require("../models/permissionModel");

// 分配单个权限（增加参数校验+错误日志）
exports.assignPermission = (userId, permCode, callback) => {
  // ✅ 第一步：校验参数合法性
  if (!userId || !permCode) {
    const err = new Error("用户ID和权限编码不能为空");
    console.error("分配权限参数错误：", err.message);
    return callback(err, null);
  }
  // 转换userId为数字（避免字符串ID导致SQL错误）
  const userIdNum = Number(userId);
  if (isNaN(userIdNum)) {
    const err = new Error("用户ID必须是数字");
    console.error("分配权限参数错误：", err.message);
    return callback(err, null);
  }
  // 调用Model层，增加错误日志
  permissionModel.assignPermission(userIdNum, permCode, (err, result) => {
    if (err) {
      console.error("分配权限Model层错误：", err);
      return callback(err, null);
    }
    callback(null, result);
  });
};

// 回收单个权限（核心修复：参数校验+错误日志）
exports.revokePermission = (userId, permCode, callback) => {
  // ✅ 第一步：校验参数不能为空
  if (!userId || !permCode) {
    const err = new Error("用户ID和权限编码不能为空");
    console.error("回收权限参数错误：", err.message);
    return callback(err, null);
  }
  // ✅ 第二步：强制转换userId为数字（解决SQL参数类型不匹配）
  const userIdNum = Number(userId);
  if (isNaN(userIdNum)) {
    const err = new Error("用户ID必须是数字");
    console.error("回收权限参数错误：", err.message);
    return callback(err, null);
  }
  // 调用Model层，捕获并打印错误
  permissionModel.revokePermission(userIdNum, permCode, (err, result) => {
    if (err) {
      console.error("回收权限Model层错误：", err);
      return callback(err, null);
    }
    // ✅ 第三步：检查是否真的回收了权限（无数据变更时提示）
    if (result && result.affectedRows === 0) {
      const err = new Error("该用户未拥有此权限，无需回收");
      console.warn("回收权限警告：", err.message);
      return callback(err, null);
    }
    callback(null, result);
  });
};

// 查询用户已拥有的权限（增加参数校验）
exports.getUserPermissions = (userId, callback) => {
  if (!userId) {
    const err = new Error("用户ID不能为空");
    console.error("查询用户权限参数错误：", err.message);
    return callback(err, null);
  }
  const userIdNum = Number(userId);
  if (isNaN(userIdNum)) {
    const err = new Error("用户ID必须是数字");
    console.error("查询用户权限参数错误：", err.message);
    return callback(err, null);
  }
  permissionModel.getUserPermissions(userIdNum, (err, result) => {
    if (err) {
      console.error("查询用户权限Model层错误：", err);
      return callback(err, null);
    }
    callback(null, result);
  });
};

// 查询所有权限（增加错误日志）
exports.getAllPermissions = (callback) => {
  permissionModel.getAllPermissions((err, result) => {
    if (err) {
      console.error("查询所有权限Model层错误：", err);
      return callback(err, null);
    }
    callback(null, result);
  });
};

// 批量分配权限（增加参数校验）
exports.batchAssignPermissions = (userId, permCodes, callback) => {
  if (
    !userId ||
    !permCodes ||
    !Array.isArray(permCodes) ||
    permCodes.length === 0
  ) {
    const err = new Error("用户ID不能为空，且权限编码必须是非空数组");
    console.error("批量分配权限参数错误：", err.message);
    return callback(err, null);
  }
  const userIdNum = Number(userId);
  if (isNaN(userIdNum)) {
    const err = new Error("用户ID必须是数字");
    console.error("批量分配权限参数错误：", err.message);
    return callback(err, null);
  }
  permissionModel.batchAssignPermissions(
    userIdNum,
    permCodes,
    (err, result) => {
      if (err) {
        console.error("批量分配权限Model层错误：", err);
        return callback(err, null);
      }
      callback(null, result);
    },
  );
};

// 按模块分组查询所有权限
exports.getAllPermissionsGrouped = (callback) => {
  // 参数校验（无入参，直接调用Model）
  permissionModel.getAllPermissionsGrouped((err, result) => {
    if (err) {
      console.error("分组查询权限Model层错误：", err);
      return callback(err, null);
    }
    callback(null, result);
  });
};
