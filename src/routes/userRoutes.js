const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {verifyToken} = require("../middleware/authMiddleware");
const {checkPermission} = require("../middleware/permissionMiddleware");

// 1. 获取用户列表（✅ 最优写法：verifyToken + checkPermission，无需重复verifyAdmin）
// 原因：checkPermission已包含admin直接放行的逻辑，无需叠加verifyAdmin
router.get('/list',
    verifyToken,
    checkPermission('user:list'), // admin自动放行，普通用户校验user:list权限
    userController.getUserList
);

// 2. 更新用户状态（✅ 管理员专属：verifyToken + verifyAdmin 或 checkPermission('user:update')）
// 推荐用checkPermission，统一权限校验逻辑
router.post('/update-status',
    verifyToken,
    checkPermission('user:update'), // 或用verifyAdmin（二选一，推荐前者）
    userController.updateStatus
);

// 3. 邮箱验证接口（✅ 个人操作：仅登录即可，单鉴权）
router.post('/verify-email', verifyToken, userController.verifyUserEmail);

// 4. 更新个人网站接口（✅ 个人操作：仅登录即可，单鉴权）
router.put('/update-website', verifyToken, userController.updateWebsite);

// 5. 退出登录接口（✅ 必须登录，单鉴权）
router.post('/logout', verifyToken, userController.userLogout);

// 6. 删除用户接口（✅ 高危操作：verifyToken + checkPermission('user:delete')）
router.delete('/delete/:userId',
    verifyToken,
    checkPermission('user:delete'), // 比verifyAdmin更灵活（可给非admin分配删除权限）
    userController.deleteUser
);

// 7. 更新用户角色（✅ 核心权限：verifyToken + checkPermission('user:assign:role')）
router.put('/role',
    verifyToken,
    checkPermission('user:assign:role'),
    userController.updateUserRole
);

// 8. 更新用户名和邮箱（✅ 个人操作：仅登录即可，单鉴权）
// 注意：如果是管理员修改他人信息，需加checkPermission('user:update')
router.put('/username-email', verifyToken, userController.updateUserNameAndEmail);

// 9. 用户搜索接口（✅ 同用户列表：verifyToken + checkPermission('user:list')）
router.get('/search',
    verifyToken,
    checkPermission('user:list'),
    userController.getUserListController
);

router.get('/info', verifyToken, userController.getUserInfo);

router.put('/password', verifyToken, userController.changePassword);

module.exports = router;