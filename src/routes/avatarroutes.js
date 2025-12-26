const express = require('express');
const router = express.Router();
const avatarController = require('../controllers/avatarController');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

// 上传头像
router.post(
    '/upload',
    authMiddleware.verifyToken, // 1. 验证token，设置req.user
    uploadMiddleware,           // 2. 处理文件上传（此时可以访问req.user）
    avatarController.uploadAvatar // 3. 处理业务逻辑
);

// 获取头像
router.get(
    '/avatar',
    authMiddleware.verifyToken,
    avatarController.getAvatar
);
// 删除头像TODO
module.exports = router;