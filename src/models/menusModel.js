// menusModel.js
const { query } = require("../config/db");

// menusModel.js 中修改 buildMenuTree 函数
function buildMenuTree(menus) {
  const menuMap = {};
  const treeMenus = [];

  menus.forEach((menu) => {
    menuMap[menu.id] = {
      ...menu,
      children: [],
    };
  });

  menus.forEach((menu) => {
    // 修正：只判断 parent_id 为 NULL（一级菜单）
    if (menu.parent_id === null) {
      treeMenus.push(menuMap[menu.id]);
    } else {
      const parentMenu = menuMap[menu.parent_id];
      // 确保父菜单存在且是一级菜单（parent_id 为 NULL）
      if (parentMenu && parentMenu.parent_id === null) {
        parentMenu.children.push(menuMap[menu.id]);
      }
    }
  });

  treeMenus.sort((a, b) => a.sort - b.sort);
  treeMenus.forEach((menu) => {
    menu.children.sort((a, b) => a.sort - b.sort);
  });

  return treeMenus;
}

// 2. 获取所有菜单（树形结构）
exports.getAllMenus = (callback) => {
  const sql = `
    SELECT * FROM menu 
    WHERE is_show = 1 
    ORDER BY sort ASC
  `;

  query(sql, (err, results) => {
    if (err) {
      console.error("获取菜单列表失败：", err);
      return callback(err, null);
    }

    const treeMenus = buildMenuTree(results);
    callback(null, treeMenus);
  });
};

// 3. 按用户权限过滤菜单（树形结构）
exports.getMenusByPermissions = (permissionCodes, callback) => {
  if (!permissionCodes || permissionCodes.length === 0) {
    return callback(null, []);
  }

  const placeholders = permissionCodes.map(() => "?").join(",");
  const sql = `
    SELECT * FROM menu 
    WHERE is_show = 1 
      AND (permission_code IN (${placeholders}) OR permission_code IS NULL)
    ORDER BY sort ASC
  `;

  query(sql, permissionCodes, (err, results) => {
    if (err) {
      console.error("按权限获取菜单失败：", err);
      return callback(err, null);
    }
    const treeMenus = buildMenuTree(results);
    callback(null, treeMenus);
  });
};

// 4. （可选）新增：按父ID获取子菜单（用于权限分发）
exports.getChildrenMenusByParentId = (parentId, callback) => {
  const sql = `
    SELECT * FROM menu 
    WHERE parent_id = ? AND is_show = 1 
    ORDER BY sort ASC
  `;

  query(sql, [parentId], (err, results) => {
    if (err) {
      console.error("获取子菜单失败：", err);
      return callback(err, null);
    }
    callback(null, results);
  });
};
