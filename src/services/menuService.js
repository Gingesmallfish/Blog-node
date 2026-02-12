// 假设你的数据库查询方法是 query（保持和你原有代码一致）
const { query } = require('../config/db'); // 你的数据库连接文件

// 1. 核心：把扁平的菜单数组转成树形结构（适配一级/二级菜单）
function buildMenuTree(menus) {
  // 第一步：创建菜单ID到菜单的映射，方便快速查找父菜单
  const menuMap = {};
  // 第二步：存储最终的一级菜单（树形结构根节点）
  const treeMenus = [];

  // 先把所有菜单存入map，同时初始化children数组
  menus.forEach(menu => {
    menuMap[menu.id] = {
      ...menu, // 复制原有菜单属性（id/title/icon/path等）
      children: [] // 新增children字段，存储二级菜单
    };
  });

  // 遍历菜单，区分一级/二级
  menus.forEach(menu => {
    if (menu.parent_id === null || menu.parent_id === 0) {
      // parent_id为null/0 → 一级菜单，直接加入根节点
      treeMenus.push(menuMap[menu.id]);
    } else {
      // 只处理二级菜单（父菜单必须是一级菜单）
      const parentMenu = menuMap[menu.parent_id];
      if (parentMenu && parentMenu.parent_id === null) { // 确保父菜单是一级
        parentMenu.children.push(menuMap[menu.id]);
      }
    }
  });

  // 最后按sort排序（一级/二级都按sort升序）
  treeMenus.sort((a, b) => a.sort - b.sort);
  treeMenus.forEach(menu => {
    menu.children.sort((a, b) => a.sort - b.sort);
  });

  return treeMenus;
}

// 2. 改造你的getAllMenus方法（保留回调风格，返回树形结构）
exports.getAllMenus = (callback) => {
  // 优化SQL：只查显示的菜单，且按sort排序（和你原有业务匹配）
  const sql = `
    SELECT * FROM menu 
    WHERE is_show = 1 
    ORDER BY sort ASC
  `;

  query(sql, (err, results) => {
    if (err) {
      console.error('获取菜单列表失败：', err);
      return callback(err, null);
    }

    // 关键：把扁平的results转成树形结构（一级+二级菜单）
    const treeMenus = buildMenuTree(results);
    callback(null, treeMenus);
  });
};

// 3. 额外补充：按用户权限过滤菜单的方法（可选，后续权限控制用）
exports.getMenusByPermissions = (permissionCodes, callback) => {
  if (!permissionCodes || permissionCodes.length === 0) {
    return callback(null, []);
  }

  // 拼接权限码的占位符（防止SQL注入）
  const placeholders = permissionCodes.map(() => '?').join(',');
  const sql = `
    SELECT * FROM menu 
    WHERE is_show = 1 
      AND (permission_code IN (${placeholders}) OR permission_code IS NULL)
    ORDER BY sort ASC
  `;

  query(sql, permissionCodes, (err, results) => {
    if (err) {
      console.error('按权限获取菜单失败：', err);
      return callback(err, null);
    }
    const treeMenus = buildMenuTree(results);
    callback(null, treeMenus);
  });
};