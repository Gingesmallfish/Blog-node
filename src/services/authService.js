const authService = require('../models/authModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. 用户注册业务逻辑（新增 email_verified、website 字段处理）
exports.registerUser = (userInfo, callback) => {
    // 解构时新增 website 字段（前端可选传）
    const {username, email, password, role, website} = userInfo;
    const validRoles = ['visitor', 'user', 'admin', 'author'];  // 用户角色
    const finalRole = validRoles.includes(role) ? role : undefined;
    const token = jwt.sign({username}, 'secret', {expiresIn: '24h'});

    authService.checkUserExists(username, email, (checkErr, checkResult) => {
        if (checkErr) {
            return callback(checkErr, null);
        }
        if (checkResult && checkResult.length > 0) {
            const existsUser = checkResult[0];
            const errMsg = existsUser.username === username ? '用户名已被占用' : '邮箱已被注册';
            return callback(new Error(errMsg), null);
        }

        // 加盐密码
        bcrypt.genSalt(10, (saltErr, salt) => {
            if (saltErr) {
                console.log('服务层：生成盐值失败', saltErr);
                return callback(new Error('密码加密失败'), null);
            }

            // 创建用户
            bcrypt.hash(password, salt, (hashErr, passwordHash) => {
                if (hashErr) {
                    console.log('服务层：密码加密失败', hashErr);
                    return callback(new Error('密码加密失败'), null);
                }

                // 调用模型层时，新增 website 字段，email_verified 固定传 false（注册默认未验证）
                authService.createUser({
                    username,
                    email,
                    passwordHash,
                    role: finalRole,
                    website: website || null, // 前端不传则为 null
                    emailVerified: false // 注册时默认未验证
                }, (insertErr, insertResult) => {
                    if (insertErr) {
                        return callback(new Error('插入用户数据失败'), null);
                    }

                    // 返回数据中新增 email_verified、website 字段
                    const userData = {
                        id: insertResult.insertId,
                        username,
                        email,
                        role: finalRole || '',
                        status: 'inactive',
                        email_verified: false, // 新增：默认未验证
                        website: website || null, // 新增：个人网站（前端传则返回，否则 null）
                        token: token,
                        created_at: new Date().toISOString(),
                    };
                    callback(null, userData);
                });
            });
        });
    });
};

// 2. 修复后的登录业务逻辑（核心：合并两次 callback）
exports.loginUser = (loginInfo, callback) => {
    const {usernameOrEmail, password} = loginInfo;

    // 步骤1：查询用户是否存在
    authService.findUserByUsernameOrEmail(usernameOrEmail, (err, user) => {
        if (err) {
            return callback(new Error('登录查询失败'), null);
        }
        if (!user) {
            return callback(new Error('用户名或密码错误'), null);
        }

        // 步骤2：检查用户状态（提前校验，避免无效密码验证）
        if (user.status === 'banned') {
            return callback(new Error(`账号已被封禁：${user.status}`), null);
        }

        // 步骤3：验证密码
        bcrypt.compare(password, user.password_hash, (hashErr, isMatch) => {
            if (hashErr) {
                return callback(new Error('密码验证失败'), null);
            }
            if (!isMatch) {
                return callback(new Error('用户名或密码错误'), null);
            }

            // 步骤4：更新最后登录时间（密码验证成功后才更新）
            authService.updateLastLogin(user.id, (updateErr) => {
                if (updateErr) {
                    console.log('更新最后登录时间失败', updateErr);
                    // 仅打印警告，不阻断登录
                }

                // 步骤5：生成Token（统一环境变量，无则用默认值）
                const token = jwt.sign({
                        id: user.id,
                        username: user.username,
                        role: user.role
                    }, process.env.JWT_SECRET || 'your_secure_jwt_secret_key_here', // 兼容无环境变量的情况
                    {expiresIn: process.env.JWT_EXPIRES_IN || '24h'});

                // 步骤6：组装用户数据（仅调用一次 callback！）
                const userData = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    avatar: user.avatar,
                    created_at: user.created_at,
                    token: token
                };
                callback(null, userData); // 唯一的 callback 调用
            });
        });
    });
};
