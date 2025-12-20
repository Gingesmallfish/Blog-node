const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userMiddleware = require('../middleware/userMiddleware');

// 1. /text 接口（无需参数校验，直接映射控制器）
router.get('/text', userController.getTestUserList);

// 2. 注册接口（先经过参数校验中间件，再进入控制器）
router.post('/register', userMiddleware.validateRegisterParams, // 接口级中间件：参数校验
    userController.userRegister
);

// 3. 登陆接口（先经过参数校验中间件，再进入控制器）
// 在现有代码基础上添加：登录接口路由
router.post(
    '/login',
    userMiddleware.validateLoginParams, // 登录参数校验
    userController.userLogin // 登录控制器
);

module.exports = router;