const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkPermission , checkUserListPermission} = require("../middleware/permissionMiddleware");

// 1. 获取用户列表（✅ 最优写法：verifyToken + checkPermission，无需重复verifyAdmin）
// 原因：checkPermission已包含admin直接放行的逻辑，无需叠加verifyAdmin
router.get(
  "/list",
  verifyToken,
  checkPermission("user:list"), // admin自动放行，普通用户校验user:list权限
  checkUserListPermission,
  userController.getUserList,
);


// 4. 更新个人网站接口（✅ 个人操作：仅登录即可，单鉴权）
router.put("/update-website", verifyToken, userController.updateWebsite);

// 5. 退出登录接口（✅ 必须登录，单鉴权）
router.post("/logout", verifyToken, userController.userLogout);

// 6. 删除用户接口（✅ 高危操作：verifyToken + checkPermission('user:delete')）
router.delete(
  "/delete/:userId",
  verifyToken,
  checkPermission("user:delete"), // 比verifyAdmin更灵活（可给非admin分配删除权限）
  userController.deleteUser,
);

// 9. 用户搜索接口（✅ 同用户列表：verifyToken + checkPermission('user:list')）
router.get(
  "/search",
  verifyToken,
  checkPermission("user:list"),
  userController.getUserListController,
);
// 10. 获取用户信息接口（✅ 个人操作：仅登录即可，单鉴权）
router.get("/info", verifyToken, userController.getUserInfo);

// 11. 修改密码接口（✅ 个人操作：仅登录即可，单鉴权）
router.put("/password", verifyToken, userController.changePassword);

// 12. 修改用户核心信息（用户名、邮箱
router.put('/edit-user-core-info', verifyToken, userController.editUserCoreInfo); 
// 13. 修改用户个人信息（简介、地址、电话等）
router.put('/edit-user-personal-info', verifyToken, userController.editUserPersonalInfo);


module.exports = router;
