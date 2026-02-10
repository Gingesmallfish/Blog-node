const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const authMiddleware = require('../middleware/authMiddleware'); // 你的鉴权中间件
const permMiddleware = require('../middleware/permissionMiddleware'); // 你的权限中间件

// ✅ 方案1：仅管理员可分配权限（推荐）
router.post(
    '/assign',
    authMiddleware.verifyToken, // 先校验登录
    permMiddleware.checkAdmin,  // 再校验是否是管理员
    permissionController.assignPermission
);

// ✅ 方案2：校验permission:assign权限（兼容非admin但有此权限的场景）
router.post(
    '/revoke',
    authMiddleware.verifyToken,
    permMiddleware.checkPermission('permission:revoke'), // 校验回收权限
    permissionController.revokePermission
);

// 查询所有权限：登录即可
router.get(
    '/all-permissions',
    authMiddleware.verifyToken,
    permissionController.getAllPermissions
);

// 查询用户权限：登录即可
router.get(
    '/user-permissions',
    authMiddleware.verifyToken,
    permissionController.getUserPermissions
);


// 新增：按模块分组查询所有权限（GET请求）
router.get('/all-grouped',
    authMiddleware.verifyToken, // 先校验登录
    permMiddleware.checkAdmin,  // 再校验是否是管理员
    permissionController.getAllPermissionsGrouped
);

module.exports = router;