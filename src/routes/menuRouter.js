const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { verifyToken } = require('../middleware/authMiddleware');

// 接口1：获取所有菜单（无需登录，测试用）
router.get('/all/menus', verifyToken, menuController.getAllMenus);

// 接口2：获取当前用户的菜单（需要登录，后续加权限中间件）
router.get('/user/menus', verifyToken, menuController.getMenusByUser);

module.exports = router;