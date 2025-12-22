const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userMiddleware = require('../middleware/userMiddleware');
// const { verifyToken } = require('../middleware/authMiddleware');
// const uploadAvatarMiddleware = require('../middleware/uploadMiddleware');
// const { uploadAvatar } = require('../controllers/avatarController');

// router.post('/avatar/upload',
//     verifyToken,          // 1. 先验证Token，挂载req.user
//     uploadAvatarMiddleware, // 2. 再处理文件上传（生成临时文件）
//     uploadAvatar          // 3. 最后重命名文件+更新数据库
// );

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

// 新增：更新用户状态接口
router.post('/update-status', userController.updateStatus);


// 新增路由
router.post('/verify-email', userController.verifyUserEmail); // 邮箱验证
router.put('/update-website', userController.updateWebsite); // 更新个人网站

module.exports = router;