const express = require('express');
const router = express.Router();
const userRotes = require('../routes/userRoutes');
const avatarRoutes = require('../routes/avatarRoutes');

// 挂在用户的路由
router.use('/', userRotes);

// 头像
router.use('/', avatarRoutes)

module.exports = router;