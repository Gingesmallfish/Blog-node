const authService = require("../models/authModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getUserPermissions } = require("./userService");
const {
  findUserByUsernameOrEmail,
  updateLastLogin,
} = require("../models/authModel");

// 1. 用户注册业务逻辑（新增 email_verified、website 字段处理）
exports.registerUser = (userInfo, callback) => {
  // 解构时新增 website 字段（前端可选传）
  const { username, email, password, role, website } = userInfo;
  const validRoles = ["visitor", "user", "admin", "author"]; // 用户角色
  const finalRole = validRoles.includes(role) ? role : undefined;
  const token = jwt.sign({ username }, "secret", { expiresIn: "24h" });

  authService.checkUserExists(username, email, (checkErr, checkResult) => {
    if (checkErr) {
      return callback(checkErr, null);
    }
    if (checkResult && checkResult.length > 0) {
      const existsUser = checkResult[0];
      const errMsg =
        existsUser.username === username ? "用户名已被占用" : "邮箱已被注册";
      return callback(new Error(errMsg), null);
    }

    // 加盐密码
    bcrypt.genSalt(10, (saltErr, salt) => {
      if (saltErr) {
        console.log("服务层：生成盐值失败", saltErr);
        return callback(new Error("密码加密失败"), null);
      }

      // 创建用户
      bcrypt.hash(password, salt, (hashErr, passwordHash) => {
        if (hashErr) {
          console.log("服务层：密码加密失败", hashErr);
          return callback(new Error("密码加密失败"), null);
        }

        // 调用模型层时，新增 website 字段，email_verified 固定传 false（注册默认未验证）
        authService.createUser(
          {
            username,
            email,
            passwordHash,
            role: finalRole,
            website: website || null, // 前端不传则为 null
            emailVerified: false, // 注册时默认未验证
          },
          (insertErr, insertResult) => {
            if (insertErr) {
              return callback(new Error("插入用户数据失败"), null);
            }

            // 返回数据中新增 email_verified、website 字段
            const userData = {
              id: insertResult.insertId,
              username,
              email,
              role: finalRole || "",
              status: "inactive",
              email_verified: false, // 新增：默认未验证
              website: website || null, // 新增：个人网站（前端传则返回，否则 null）
              token: token,
              created_at: new Date().toISOString(),
            };
            callback(null, userData);
          },
        );
      });
    });
  });
};

// 登录核心逻辑（新增权限查询）
exports.loginUser = (loginData, callback) => {
  const { usernameOrEmail, password } = loginData;

  // 1. 查询用户基本信息
  findUserByUsernameOrEmail(usernameOrEmail, (err, user) => {
    if (err) return callback(new Error("查询用户失败：" + err.message));
    if (!user) return callback(new Error("用户名或密码错误"));

    // 2. 验证密码
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) return callback(new Error("用户名或密码错误"));

    // 3. 检查用户状态
    if (user.status === "banned")
      return callback(new Error("账号已被封禁，无法登录"));
    if (user.status === "inactive")
      return callback(new Error("账号未激活，请联系管理员"));

    // 4. ✅ 核心新增：查询用户权限
    getUserPermissions(user.id, (permErr, permData) => {
      if (permErr) {
        // 权限查询失败兜底（返回空数组）
        console.warn("查询用户权限失败：", permErr);
        permData = { role: user.role, permissions: [] };
      }

      // 5. 生成Token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "8h" },
      );

      // 6. 更新最后登录时间
      updateLastLogin(user.id, (updateErr) => {
        if (updateErr) console.warn("更新最后登录时间失败：", updateErr);
      });

      // 7. ✅ 构造返回数据（包含permissions）
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar || null,
        created_at: user.created_at,
        token: token,
        permissions: permData.permissions || [], // ✅ 关键：添加权限数组
      };

      // 8. 返回完整数据（包含权限）
      callback(null, userData);
    });
  });
};
