const authService = require('../services/authService');

// 1. 注册控制器
exports.userRegister = (req, res, next) => {
    const {username, email, password, role} = req.body;

    authService.registerUser({username, email, password, role}, (err, userData) => {
        if (err) {
            return next(err);
        }

        req.session.user = {
            id: userData.id, username: userData.username, email: userData.email
        };
        req.session.token = userData.token;

        res.status(200).json({
            code: 200, msg: '注册成功', data: userData
        });
    });
};

// 2. 登录控制器（修正：匹配「账号已被封禁」的文案）
exports.userLogin = (req, res, next) => {
    const {usernameOrEmail, password} = req.body;

    if (!usernameOrEmail || !password) {
        return res.status(400).json({
            code: 400, msg: '用户名/邮箱和密码不能为空', data: null
        });
    }

    authService.loginUser({usernameOrEmail, password}, (err, userData) => {
        if (err) {
            // 匹配服务层返回的「账号已被封禁」文案
            if (err.message.includes('账号已被封禁')) {
                return res.status(403).json({
                    code: 403, msg: err.message, data: null
                });
            }
            // 匹配密码/用户不存在的错误
            if (err.message.includes('用户名或密码错误') || err.message.includes('密码验证失败')) {
                return res.status(400).json({
                    code: 400, msg: err.message, data: null
                });
            }
            // 其他服务器错误
            return next(err);
        }

        // 仅一次响应！
        res.status(200).json({
            code: 200, msg: '登录成功', data: userData
        });
    });
};
