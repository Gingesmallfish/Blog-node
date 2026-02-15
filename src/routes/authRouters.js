const express = require('express');
const router = express.Router();
const {validateRegisterParams, validateLoginParams} = require("../middleware/userMiddleware");
const {userRegister, userLogin} = require("../controllers/authController");

// 2. 注册接口（先经过参数校验中间件，再进入控制器）
router.post('/register', validateRegisterParams, // 接口级中间件：参数校验
    userRegister
);

// 3. 登陆接口（先经过参数校验中间件，再进入控制器）
// 在现有代码基础上添加：登录接口路由
// 应该是这样的配置
router.post('/login', validateLoginParams, userLogin);


module.exports = router;