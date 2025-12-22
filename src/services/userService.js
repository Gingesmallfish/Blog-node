const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// 1. 用户注册业务逻辑（新增 email_verified、website 字段处理）
exports.registerUser = (userInfo, callback) => {
    // 解构时新增 website 字段（前端可选传）
    const {username, email, password, role, website } = userInfo;
    const validRoles = ['visitor', 'user', 'admin', 'author'];
    const finalRole = validRoles.includes(role) ? role : undefined;
    const token = jwt.sign({username}, 'secret', {expiresIn: '24h'});

    userModel.checkUserExists(username, email, (checkErr, checkResult) => {
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
                userModel.createUser({
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
                        status: 'active',
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

// 2. 新增：验证邮箱（标记 email_verified 为 true）
exports.verifyEmail = (userId, callback) => {
    // 校验用户ID合法性
    if (!userId || isNaN(Number(userId))) {
        return callback(new Error('用户ID必须是有效数字'), null);
    }
    // 调用模型层更新邮箱验证状态
    userModel.updateEmailVerified(userId, true, (err, result) => {
        if (err) {
            console.log('服务层：更新邮箱验证状态失败', err);
            return callback(err, null);
        }
        callback(null, { msg: '邮箱验证成功' });
    });
};

// 3. 新增：更新个人网站
exports.updateUserWebsite = (userId, website, callback) => {
    // 校验用户ID合法性
    if (!userId || isNaN(Number(userId))) {
        return callback(new Error('用户ID必须是有效数字'), null);
    }
    // 可选：简单校验URL格式（前端传了才校验）
    if (website && !/^https?:\/\/.+/.test(website)) {
        return callback(new Error('个人网站URL格式错误（需以http/https开头）'), null);
    }
    // 调用模型层更新个人网站
    userModel.updateUserWebsite(userId, website, (err, result) => {
        if (err) {
            console.log('服务层：更新个人网站失败', err);
            return callback(err, null);
        }
        callback(null, { msg: '个人网站更新成功', website });
    });
};

// 2. 修复后的登录业务逻辑（核心：合并两次 callback）
exports.loginUser = (loginInfo, callback) => {
    const {usernameOrEmail, password} = loginInfo;

    // 步骤1：查询用户是否存在
    userModel.findUserByUsernameOrEmail(usernameOrEmail, (err, user) => {
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
            userModel.updateLastLogin(user.id, (updateErr) => {
                if (updateErr) {
                    console.log('更新最后登录时间失败', updateErr);
                    // 仅打印警告，不阻断登录
                }

                // 步骤5：生成Token（统一环境变量，无则用默认值）
                const token = jwt.sign({id: user.id, username: user.username}, process.env.JWT_SECRET || 'secret', // 兼容无环境变量的情况
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

// 3. 更新用户状态（保留原有逻辑，无需修改）
exports.updateUserStatus = (userId, status, callback) => {
    if (!userId || isNaN(Number(userId))) {
        return callback(new Error('用户ID必须是有效数字'), null);
    }
    const validStatus = ['active', 'inactive', 'banned'];
    if (!validStatus.includes(status)) {
        return callback(new Error(`状态值必须是：${validStatus.join('/')}`), null);
    }

    userModel.updateUserStatus(userId, status, (err, result) => {
        if (err) {
            console.log('服务层：更新用户状态失败', err);
            return callback(err, null);
        }
        if (result.affectedRows === 0) {
            return callback(new Error(`用户ID ${userId} 不存在，更新失败`), null);
        }
        callback(null, result);
    });
};

// 4. 查询所有用户（保留原有逻辑，无需修改）
exports.getUserList = (callback) => {
    userModel.getAllUsers((err, result) => {
        if (err) {
            return callback(new Error('查询用户列表失败'), null);
        }
        callback(null, result);
    });
};