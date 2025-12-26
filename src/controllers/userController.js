const userService = require('../services/userService');
const userModel = require('../models/userModel');
const path = require('path');
const fs = require('fs');

// 1. 注册控制器（保留）
exports.userRegister = (req, res, next) => {
    const {username, email, password, role} = req.body;

    userService.registerUser({username, email, password, role}, (err, userData) => {
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

// 新增邮箱验证
exports.verifyUserEmail = (req, res, next) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({
            code: 400, msg: '缺少必填参数：userId', date: null
        });
    }


    userService.verifyEmail(userId, (err, userData) => {
        if (err) {
            return res.status(400).json({
                code: 400, msg: err.message, data: null
            });
        }
        return res.status(200).json({
            code: 200, msg: '验证成功', data: null
        });
    })
};

// 新增更新个人网站接口
exports.updateWebsite = (req, res, next) => {
    const {userId, website} = req.body || {};
    if (!userId) {
        return res.status(400).json({
            code: 400, msg: '缺少必填参数：userId', data: null
        });
    }

    userService.updateUserWebsite(userId, website, (err, result) => {
        if (err) {
            return res.status(400).json({
                code: 400, msg: err.message, data: null
            });
        }
        return res.status(200).json({
            code: 200, msg: '更新成功', data: {website: result.website}
        });
    })

}


// 2. 登录控制器（修正：匹配「账号已被封禁」的文案）
exports.userLogin = (req, res, next) => {
    const {usernameOrEmail, password} = req.body;

    if (!usernameOrEmail || !password) {
        return res.status(400).json({
            code: 400, msg: '用户名/邮箱和密码不能为空', data: null
        });
    }

    userService.loginUser({usernameOrEmail, password}, (err, userData) => {
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

// 3. 更新状态控制器（保留）
exports.updateStatus = (req, res, next) => {
    const {userId, status} = req.body || {};

    if (!userId) {
        return res.status(400).json({
            code: 400, msg: '缺少必填参数：userId', data: null
        });
    }
    if (!status) {
        return res.status(400).json({
            code: 400, msg: '缺少必填参数：status', data: null
        });
    }

    userService.updateUserStatus(userId, status, (err) => {
        if (err) {
            return res.status(400).json({
                code: 400, msg: err.message, data: null
            });
        }
        res.status(200).json({
            code: 200, msg: '状态更新成功', data: null
        });
    });
};

// 4. 查询用户列表控制器（保留）
exports.getTestUserList = (req, res, next) => {
    userService.getUserList((err, userList) => {
        if (err) {
            return next(err);
        }

        res.status(200).json({
            code: 200, msg: '查询成功', data: userList
        });
    });
};


exports.userLogout = (req, res) => {
    // req.token：鉴权中间件挂载的有效Token
    // req.session：Session对象
    userService.logoutUser(req.token, req.session, (err, result) => {
        if (err) {
            console.error('退出失败：', err);
            return res.status(500).json({
                code: 500,
                msg: '退出失败，请重试',
                data: null
            });
        }
        res.status(200).json({
            code: 200,
            msg: result.msg,
            data: null
        });
    });
};