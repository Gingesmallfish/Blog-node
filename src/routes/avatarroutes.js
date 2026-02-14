const express = require("express");
const router = express.Router();
const avatarController = require("../controllers/avatarController");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

// 所有接口都需要登录验证
router.use(authMiddleware.verifyToken);

// 1. 上传头像文件
router.post("/upload", uploadMiddleware, avatarController.uploadAvatar);

// 2. 通过ID修改头像URL
router.post("/update-by-id", avatarController.updateAvatarById);

// 3. 获取头像
router.get("/get", avatarController.getAvatar);

module.exports = router;