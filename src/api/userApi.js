const express = require('express');
const router = express.Router();
const userRotes = require('../routes/userRoutes');
const avatarRoutes = require('../routes/avatarRoutes');
const authRoutes = require('../routes/authRouters');
// 挂在用户的路由
router.use('/', userRotes);

// 头像
router.use('/', avatarRoutes)


// 登陆和注册
router.use('/', authRoutes)

// 导出
module.exports = router;