const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {verifyToken, verifyAdmin} = require("../middleware/authMiddleware");

// 1. /user 接口（无需参数校验，直接映射控制器）
router.get('/user', userController.getTestUserList);

// 新增：更新用户状态接口
router.post('/update-status', userController.updateStatus);


// 新增路由
router.post('/verify-email', userController.verifyUserEmail); // 邮箱验证
router.put('/update-website', userController.updateWebsite); // 更新个人网站


// 退出路由：先鉴权，再执行退出
router.post('/logout', verifyToken, userController.userLogout);

// ✅ 关键：绑定双中间件，顺序不可变 → 先验登录，再验权限
router.delete('/delete/:userId', verifyToken, verifyAdmin, userController.deleteUser);

// 更新用户角色（需 登录+管理员权限）
router.put('/role', verifyToken, verifyAdmin, userController.updateUserRole);

// 更新用户名和邮件（需 登录权限）
router.put('/username-email', verifyToken, userController.updateUserNameAndEmail);

module.exports = router;