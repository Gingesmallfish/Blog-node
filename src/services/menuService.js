// menuService.js
const menusModel = require("../models/menusModel");

// 1. 获取所有菜单（树形结构）
exports.getAllMenus = (callback) => {
  menusModel.getAllMenus(callback);
};

// 2. 按权限获取菜单（树形结构）
exports.getMenusByPermissions = (permissionCodes, callback) => {
  menusModel.getMenusByPermissions(permissionCodes, callback);
};

// 3. （可选）按父ID获取子菜单
exports.getChildrenMenusByParentId = (parentId, callback) => {
  menusModel.getChildrenMenusByParentId(parentId, callback);
};