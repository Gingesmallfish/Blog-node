const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {errorHandler} = require("../middleware/userMiddleware");
const {data} = require("express-session/session/cookie");

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
        callback(null, {msg: '邮箱验证成功'});
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
        callback(null, {msg: '个人网站更新成功', website});
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
// userService.js
exports.getUserList = (page, pageSize, callback) => {
    // 计算偏移量：(页码-1)*每页条数（逻辑正确）
    const offset = (page - 1) * pageSize;
    // 1. 查询当前页数据
    userModel.getUsersByPage(offset, pageSize, (err, userList) => {
        if (err) {
            return callback(new Error('查询用户列表失败'), null, 0);
        }
        // 2. 查询总条数
        userModel.getUserTotal((err, total) => {
            if (err) {
                return callback(new Error('查询用户总数失败'), null, 0);
            }
            callback(null, userList, total[0].total);
        });
    });
};

// 退出登陆
exports.logoutUser = (token, session, callback) => {
    // 1. 拉黑Token（核心：退出后Token失效）
    global.jwtBlacklist.add(token);
    // 2. 销毁Session（有则销毁，无则忽略）
    if (session && typeof session.destroy === 'function') {
        session.destroy((err) => {
            if (err) {
                console.error('Session销毁失败：', err);
                // 即使Session销毁失败，Token已拉黑，仍算退出成功
                return callback(null, {msg: '退出登录成功'});
            }
            callback(null, {msg: '退出登录成功'});
        });
    } else {
        // 无Session，仅拉黑Token即可
        callback(null, {msg: '退出登录成功'});
    }
};


// 删除用户业务逻辑（参数校验）
exports.removeUser = (userId, callback) => {
    // 校验用户ID合法性（必须是正整数）
    if (!userId || isNaN(Number(userId)) || Number(userId) <= 0) {
        return callback(new Error('用户ID不合法，必须为正整数'), null);
    }
    // 调用Model层执行删除
    userModel.deleteUserById(Number(userId), callback);
};

// 新增：更新用户角色（调用模型层）
// 新增：更新用户角色（调用模型层）
exports.updateUserRole = (userId, newRole, callback) => {
    userModel.updateUserRole(userId, newRole, (err, data) => {
        if (err) {
            console.error('Service层-更新用户角色失败：', err);
            return callback(err, null);
        }
        callback(null, data);
    });
};


// 修改用户名和邮件的业务逻辑
exports.updateUserInfo = (id, username, email, callback) => {

    userModel.updateUserInfoById(id, username, email, callback, (err, data) => {
        if (err) return callback(err, null)
        callback(null, data)
    })
}

/**
 * 搜索，条件查询 业务逻辑
 * @param params
 * @param callback
 */
exports.getUserListService = (params, callback) => {
    userModel.getUsersByCondition(params, (err, data) => {
        if (err) {
            return callback(`用户数据查询失败：${err.message}`, null);
        }
        callback(null, data);
    });
};
