// 引入菜单服务
const menuService = require("../services/menuService");

// 1. 获取所有菜单（供前端侧边栏渲染）
exports.getAllMenus = (req, res) => {
  menuService.getAllMenus((err, menus) => {
    if (err) {
      // 错误响应
      return res.status(500).json({
        code: 500,
        message: "获取菜单失败",
        data: null,
      });
    }
    // 成功响应（返回树形菜单）
    res.status(200).json({
      code: 200,
      message: "获取菜单成功",
      data: menus,
    });
  });
};

// 2. （可选）按用户权限获取菜单（需要登录后用）
exports.getMenusByUser = (req, res) => {
  // 假设你从token/登录态中获取了用户的权限码列表
  // 这里先模拟，实际要从用户权限表查
  const userPermissions = ["article:list", "user:list"];

  menuService.getMenusByPermissions(userPermissions, (err, menus) => {
    if (err) {
      return res.status(500).json({
        code: 500,
        message: "获取用户菜单失败",
        data: null,
      });
    }
    res.status(200).json({
      code: 200,
      message: "获取用户菜单成功",
      data: menus,
    });
  });
};
