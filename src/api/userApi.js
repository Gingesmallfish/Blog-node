const express = require('express');
const router = express.Router();
const userRotes = require('../routes/userRoutes');
const avatarRoutes = require('../routes/avatarRoutes');
const authRoutes = require('../routes/authRouters');
const permissionRoutes = require('../routes/permissionRoutes');
const menuRoutes = require('../routes/menuRouter');
// 挂在用户的路由
router.use('/user', userRotes);

// 头像
router.use('/', avatarRoutes)


// 登陆和注册
router.use('/', authRoutes)

// 菜单
router.use('/', menuRoutes)

// 分配权限
router.use('/permission', permissionRoutes)
// 导出
module.exports = router;