const userService = require("../services/userService");
const userModel = require("../models/userModel");

/**
 * 邮箱验证
 * @param req 参数
 * @param res 响应
 * @returns {*} 返回数据
 */
exports.verifyUserEmail = (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      code: 400,
      msg: "缺少必填参数：userId",
      data: null,
    });
  }

  userService.verifyEmail(userId, (err) => {
    if (err) {
      return res.status(400).json({
        code: 400,
        msg: err.message,
        data: null,
      });
    }
    res.status(200).json({
      code: 200,
      msg: "邮箱验证成功",
      data: null,
    });
  });
};

/**
 * 更新个人网站
 * @param req 参数
 * @param res 响应
 * @returns {*} 返回数据
 */
exports.updateWebsite = (req, res) => {
  const { userId, website } = req.body || {};
  if (!userId) {
    return res.status(400).json({
      code: 400,
      msg: "缺少必填参数：userId",
      data: null,
    });
  }

  userService.updateUserWebsite(userId, website, (err) => {
    if (err) {
      return res.status(400).json({
        code: 400,
        msg: err.message,
        data: null,
      });
    }
    res.status(200).json({
      code: 200,
      msg: "个人网站更新成功",
      data: { website },
    });
  });
};

/**
 * 更新用户的状态
 * @param req 参数
 * @param res 响应
 * @returns {*} 返回数据
 */
exports.updateStatus = (req, res) => {
  const { userId, status } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      code: 400,
      msg: "缺少必填参数：userId",
      data: null,
    });
  }
  if (!status) {
    return res.status(400).json({
      code: 400,
      msg: "缺少必填参数：status",
      data: null,
    });
  }

  userService.updateUserStatus(userId, status, (err) => {
    if (err) {
      return res.status(400).json({
        code: 400,
        msg: err.message,
        data: null,
      });
    }
    res.status(200).json({
      code: 200,
      msg: "用户状态更新成功",
      data: null,
    });
  });
};

/**
 * 获取用户列表
 * @param req 参数
 * @param res 响应
 */


exports.getUserList = (req, res) => {
  const isAdmin = (req.user.role || "").toLowerCase() === "admin";
  const hasPermission = isAdmin || (req.user.permissions && req.user.permissions.includes("user:list"));

  if (!hasPermission) {
    return res.status(403).json({ code: 403, msg: "无用户列表访问权限", data: [] });
  }

  // 关键：从 pageNum 获取页码
  const page = parseInt(req.query.pageNum) || 1; 
  const pageSize = parseInt(req.query.pageSize) || 10;
  
  userService.getUserList(page, pageSize, (err, userList, total) => {
    if (err) {
      return res.status(500).json({ code: 500, msg: "查询失败", data: [] });
    }
    res.json({
      code: 200,
      msg: "查询成功",
      data: {
        list: userList,
        total: total,
        page,
        pageSize,
      },
    });
  });
};
/**
 * 退出登录
 * @param req 参数
 * @param res 响应
 */
exports.userLogout = (req, res) => {
  userService.logoutUser(req.token, req.session, (err) => {
    if (err) {
      console.error("退出失败：", err);
      return res.status(500).json({
        code: 500,
        msg: "退出失败，请重试",
        data: null,
      });
    }
    res.status(200).json({
      code: 200,
      msg: "退出登录成功",
      data: null,
    });
  });
};

// 删除用户接口（仅管理员）✅ 全量修复
exports.deleteUser = (req, res) => {
  const { userId } = req.params;
  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({
      code: 400,
      msg: "用户ID格式错误，必须为数字",
      data: null,
    });
  }

  userService.removeUser(userId, (err) => {
    if (err) {
      return res.status(400).json({
        code: 400,
        msg: err.message,
        data: null,
      });
    }
    res.status(200).json({
      code: 200,
      msg: "用户删除成功",
      data: null,
    });
  });
};

/**
 * ✅ 核心修复：更新用户角色（精准返回oldRole/newRole，完全匹配你要的格式）
 * @param req 参数
 * @param res 响应
 * @returns {*} 返回数据
 */
exports.updateUserRole = (req, res) => {
  const { userId, newRole } = req.body;
  // 1. 严格校验入参
  if (!userId)
    return res
      .status(400)
      .json({ code: 400, msg: "缺少必填参数：userId", data: null });
  if (!newRole)
    return res
      .status(400)
      .json({ code: 400, msg: "缺少必填参数：newRole", data: null });

  // 2. 调用服务层（已修复：返回oldRole+newRole）
  userService.updateUserRole(userId, newRole, (err, result) => {
    if (err) {
      return res.status(400).json({ code: 400, msg: err.message, data: null });
    }
    // 3. ✅ 精准返回你需要的格式，包含oldRole
    res.status(200).json({
      code: 200,
      msg: "用户角色更新成功",
      data: {
        userId: result.userId,
        oldRole: result.oldRole,
        newRole: result.newRole,
      },
    });
  });
};

/**
 * 更新用户名和邮箱
 * @param req 参数
 * @param res 响应
 */
exports.updateUserNameAndEmail = (req, res) => {
  const { id, username, email } = req.body;
  // 校验必填参数
  if (!id)
    return res
      .status(400)
      .json({ code: 400, msg: "缺少必填参数：id", data: null });
  if (!username && !email)
    return res
      .status(400)
      .json({ code: 400, msg: "至少修改用户名或邮箱一项", data: null });

  userService.updateUserInfo(id, username, email, (err, result) => {
    if (err) {
      return res.status(400).json({
        code: 400,
        msg: err.message,
        data: null,
      });
    }
    res.status(200).json({
      code: 200,
      msg: "用户名/邮箱更新成功",
      data: {
        username: result.username,
        email: result.email,
      },
    });
  });
};

/**
 * 搜索和分页查询用户列表 ✅ 修复格式问题
 * @param req 参数
 * @param res 响应
 */
exports.getUserListController = (req, res) => {
  const queryParams = req.query;

  userService.getUserListService(queryParams, (err, data) => {
    if (err) {
      return res.status(500).json({
        code: 500,
        msg: err,
        data: null, // ✅ 补充缺失的data字段
      });
    }
    res.status(200).json({
      code: 200,
      msg: "用户列表查询成功",
      data: data,
    });
  });
};

// 分配/修改用户角色 ✅ 修复格式+逻辑
exports.assignUserRole = (req, res) => {
  const { userId, newRole } = req.body;
  if (!userId || !newRole) {
    return res.status(400).json({
      code: 400,
      msg: "参数错误：userId和newRole为必填项",
      data: null, // ✅ 补充缺失的data字段
    });
  }
  userService.assignUserRole(userId, newRole, (err, result) => {
    if (err) {
      return res.status(400).json({ code: 400, msg: err.message, data: null });
    }
    res.status(200).json({
      code: 200,
      msg: "角色分配成功",
      data: result,
    });
  });
};

// 获取当前登录用户的权限信息 ✅ 修复格式
exports.getMyPermissions = (req, res) => {
  const userId = req.user.id;
  userService.getUserPermissions(userId, (err, authInfo) => {
    if (err) {
      return res.status(400).json({ code: 400, msg: err.message, data: null });
    }
    res.status(200).json({
      code: 200,
      msg: "权限信息查询成功", // ✅ 补充msg字段
      data: authInfo,
    });
  });
};

// 获取所有用户 ✅ 修复格式
exports.getAllUsers = (req, res) => {
  userModel.getAllUsers((err, users) => {
    if (err) {
      return res
        .status(500)
        .json({ code: 500, msg: "查询用户列表失败", data: null });
    }
    res.status(200).json({
      code: 200,
      msg: "所有用户查询成功", // ✅ 补充msg字段
      data: users,
    });
  });
};

exports.getUserInfo = (req, res) => {
  res.status(200).json({
    code: 200,
    msg: "查询用户信息成功",
    data: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      status: req.user.status,
      permissions: req.user.permissions, // 最新的权限数组
    },
  });
};

exports.changePassword = (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id; // 假设已登录，从 token 解析出用户 ID

  // ✅ 校验必填字段
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "旧密码和新密码不能为空" });
  }

  // ✅ 调用 service 层处理业务逻辑
  userService.changePassword(
    userId,
    oldPassword,
    newPassword,
    (err, result) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.status(200).json({
        code: 200,
        msg: "密码修改成功",
        data: { result },
      });
    },
  );
};
