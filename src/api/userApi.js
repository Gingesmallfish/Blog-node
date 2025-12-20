const express = require('express');
const router = express.Router();
const userRotes = require('../routes/userRoutes');

// 挂在用户的路由
router.use('/', userRotes);

module.exports = router;