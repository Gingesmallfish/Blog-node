const userService = require('../services/userService');

// 1. 用户注册接口控制器（仅转发请求到服务层，返回响应）
exports.userRegister = (req, res, next) => {
    const {username, email, password, role} = req.body;

    // 调用服务层的注册业务逻辑
    userService.registerUser({username, email, password, role}, (err, userData) => {
        if (err) {
            // 若有错误，交给异常处理中间件处理（调用next(err)）
            return next(err);
        }

        // 将用户信息和Token存入Session（与注册流程同步）
        req.session.user = {
            id: userData.id,
            username: userData.username,
            email: userData.email
        };
        req.session.token = userData.token; // 存储当前登录的Token

        // 业务成功，返回标准化响应
        res.status(200).json({
            code: 200,
            msg: '注册成功',
            data: userData
        });
    });
};

// 在现有代码基础上添加：登录接口控制器
exports.userLogin = (req, res, next) => {
    const { usernameOrEmail, password } = req.body;

    // 调用服务层登录逻辑
    userService.loginUser({ usernameOrEmail, password }, (err, userData) => {
        if (err) {
            return next(err); // 错误交给异常处理中间件
        }

        // 登录成功响应
        res.status(200).json({
            code: 200,
            msg: '登录成功',
            data: userData
        });
    });
};

// 2. 查询用户列表接口控制器（仅转发请求到服务层，返回响应）
exports.getTestUserList = (req, res, next) => {
    // 调用服务层的查询业务逻辑
    userService.getUserList((err, userList) => {
        if (err) {
            return next(err);
        }

        // 业务成功，返回用户列表
        res.status(200).json({
            code: 200,
            msg: '查询成功',
            data: userList
        });
    });
};