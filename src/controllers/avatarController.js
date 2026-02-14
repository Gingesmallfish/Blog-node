const fs = require("fs");
const path = require("path");
const avatarModel = require("../models/avatarModel");

// 1. 上传头像文件
exports.uploadAvatar = (req, res) => {
  // 必须登录
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      code: 401,
      msg: "请先登录",
      data: null
    });
  }

  // 必须传文件
  if (!req.file) {
    return res.status(400).json({
      code: 400,
      msg: "请上传头像文件",
      data: null
    });
  }

  // 普通用户只能改自己，管理员可指定 userId
  const loginUser = req.user;
  const targetUserId = req.body.userId ? parseInt(req.body.userId) : null;
  let finalUserId;

  if (loginUser.role === "admin") {
    if (!targetUserId) {
      return res.status(400).json({
        code: 400,
        msg: "管理员必须指定 userId",
        data: null
      });
    }
    finalUserId = targetUserId;
  } else {
    finalUserId = loginUser.id;
  }

  // 处理文件
  const tempPath = req.file.path;
  const ext = path.extname(req.file.originalname) || ".png";
  const fileName = `avatar-${finalUserId}-${Date.now()}${ext}`;
  const uploadDir = path.join(__dirname, "../uploads/avatars");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const targetPath = path.join(uploadDir, fileName);
  const avatarUrl = `http://localhost:8888/uploads/avatars/${fileName}`;

  // 移动文件
  fs.rename(tempPath, targetPath, (err) => {
    if (err) {
      return res.status(500).json({
        code: 500,
        msg: "文件保存失败",
        data: null
      });
    }

    // 更新数据库
    avatarModel.updateUserAvatar(finalUserId, avatarUrl, (dbErr) => {
      if (dbErr) {
        return res.status(500).json({
          code: 500,
          msg: "更新头像失败",
          data: null
        });
      }

      res.json({
        code: 200,
        msg: "上传成功",
        data: {
          userId: finalUserId,
          avatar: avatarUrl
        }
      });
    });
  });
};

// 2. 通过ID直接修改头像URL
exports.updateAvatarById = (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      code: 401,
      msg: "请先登录",
      data: null
    });
  }

  const { userId, avatarUrl } = req.body;

  if (!avatarUrl) {
    return res.status(400).json({
      code: 400,
      msg: "avatarUrl 不能为空",
      data: null
    });
  }

  const loginUser = req.user;
  let finalUserId;

  if (loginUser.role === "admin") {
    if (!userId) {
      return res.status(400).json({
        code: 400,
        msg: "管理员必须传 userId",
        data: null
      });
    }
    finalUserId = userId;
  } else {
    finalUserId = loginUser.id;
  }

  avatarModel.updateUserAvatar(finalUserId, avatarUrl, (err) => {
    if (err) {
      return res.status(500).json({
        code: 500,
        msg: "更新失败",
        data: null
      });
    }

    res.json({
      code: 200,
      msg: "头像URL更新成功",
      data: {
        userId: finalUserId,
        avatarUrl
      }
    });
  });
};

// 3. 获取头像（新增）
exports.getAvatar = (req, res) => {
  // 必须登录
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      code: 401,
      msg: "请先登录",
      data: null
    });
  }

  // 普通用户只能查自己，管理员可指定 userId（从query参数获取）
  const loginUser = req.user;
  const targetUserId = req.query.userId ? parseInt(req.query.userId) : null;
  let finalUserId;

  if (loginUser.role === "admin") {
    // 管理员：传了userId查指定用户，没传查自己
    finalUserId = targetUserId || loginUser.id;
  } else {
    // 普通用户：只能查自己，传了其他userId也无效
    finalUserId = loginUser.id;
  }

  // 从数据库查头像URL
  avatarModel.getUserAvatar(finalUserId, (err, avatarUrl) => {
    if (err) {
      return res.status(500).json({
        code: 500,
        msg: "获取头像失败",
        data: null
      });
    }

    // 没查到头像返回null，前端可显示默认头像
    res.json({
      code: 200,
      msg: "获取头像成功",
      data: {
        userId: finalUserId,
        avatar: avatarUrl || null
      }
    });
  });
};