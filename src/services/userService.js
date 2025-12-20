const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. 用户注册业务逻辑（核心：密码加密 + 调用模型层）
exports.registerUser = (userInfo, callback) => {
    const {username, email, password, role} = userInfo;
    const validRoles = ['visitor', 'user', 'admin', 'author'];

    // 确定最终角色: 合法使用，否侧不传递
    const finalRole = validRoles.includes(role) ? role : undefined;


    const token = jwt.sign({username}, 'secret', {expiresIn: '24h'});


    // 第一步：先校验用户名/邮箱是否已存在（调用模型层）
    userModel.checkUserExists(username, email, (checkErr, checkResult) => {
        if (checkErr) {
            return callback(checkErr, null); // 数据库查询失败，回调错误
        }

        // 若用户已存在，返回业务错误
        if (checkResult && checkResult.length > 0) {
            const existsUser = checkResult[0];
            const errMsg = existsUser.username === username
                ? '用户名已被占用'
                : '邮箱已被注册';
            return callback(new Error(errMsg), null);
        }

        // 第二步：密码加密（企业级加盐加密）
        bcrypt.genSalt(10, (saltErr, salt) => {
            if (saltErr) {
                console.log('服务层：生成盐值失败', saltErr);
                return callback(new Error('密码加密失败'), null);
            }

            bcrypt.hash(password, salt, (hashErr, passwordHash) => {
                if (hashErr) {
                    console.log('服务层：密码加密失败', hashErr);
                    return callback(new Error('密码加密失败'), null);
                }


                // 第三步：调用模型层，插入新用户数据
                userModel.createUser({
                    username,
                    email,
                    passwordHash,
                    role: finalRole
                }, (insertErr, insertResult) => {
                    if (insertErr) {
                        return callback(new Error('插入用户数据失败'), null);
                    }

                    // 组装返回数据（隐藏敏感字段）
                    const userData = {
                        id: insertResult.insertId,
                        username,
                        email,
                        role: finalRole || '',
                        status: 'active',
                        token: token,
                        created_at: new Date().toISOString(),
                    };
                    callback(null, userData); // 业务处理成功，回调用户数据
                });
            });
        });
    });
};


// 新增：登录业务逻辑
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

        // 步骤2：验证密码（与注册时的加密密码比对）
        bcrypt.compare(password, user.password_hash, (hashErr, isMatch) => {
            if (hashErr) {
                return callback(new Error('密码验证失败'), null);
            }
            if (!isMatch) {
                return callback(new Error('用户名或密码错误'), null);
            }

            // 步骤3：生成Token（使用用户ID和用户名，与注册逻辑保持一致）
            const token = jwt.sign(
                {id: user.id, username: user.username},
                process.env.JWT_SECRET,
                {expiresIn: process.env.JWT_EXPIRES_IN || '24h'}
            );

            // 步骤4：组装用户信息（隐藏敏感字段，返回必要信息）
            const userData = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
                created_at: user.created_at,
                token: token // 包含生成的Token
            };

            callback(null, userData);
        });
    });
}


// 2. 查询所有用户业务逻辑（简单转发，后续可扩展过滤、分页等业务）
exports.getUserList = (callback) => {
    // 调用模型层查询所有用户
    userModel.getAllUsers((err, result) => {
        if (err) {
            return callback(new Error('查询用户列表失败'), null);
        }
        callback(null, result); // 回调用户列表
    });
};