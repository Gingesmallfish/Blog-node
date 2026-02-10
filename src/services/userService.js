const userModel = require('../models/userModel');
const permissionModel = require('../models/permissionModel');
const bcrypt = require('bcryptjs');
// 验证邮箱
exports.verifyEmail = (userId, callback) => {
    if (!userId || isNaN(Number(userId))) {
        return callback(new Error('用户ID必须是有效数字'));
    }
    userModel.updateEmailVerified(userId, true, (err) => {
        if (err) {
            console.log('服务层：更新邮箱验证状态失败', err);
            return callback(err);
        }
        callback(null);
    });
};

// 更新个人网站
exports.updateUserWebsite = (userId, website, callback) => {
    if (!userId || isNaN(Number(userId))) {
        return callback(new Error('用户ID必须是有效数字'));
    }
    if (website && !/^https?:\/\/.+/.test(website)) {
        return callback(new Error('个人网站URL格式错误（需以http/https开头）'));
    }
    userModel.updateUserWebsite(userId, website, (err) => {
        if (err) {
            console.log('服务层：更新个人网站失败', err);
            return callback(err);
        }
        callback(null);
    });
};

// 更新用户状态
exports.updateUserStatus = (userId, status, callback) => {
    if (!userId || isNaN(Number(userId))) {
        return callback(new Error('用户ID必须是有效数字'));
    }
    const validStatus = ['active', 'inactive', 'banned'];
    if (!validStatus.includes(status)) {
        return callback(new Error(`状态值必须是：${validStatus.join('/')}`));
    }

    userModel.updateUserStatus(userId, status, (err, result) => {
        if (err) {
            console.log('服务层：更新用户状态失败', err);
            return callback(err);
        }
        if (result.affectedRows === 0) {
            return callback(new Error(`用户ID ${userId} 不存在，更新失败`));
        }
        callback(null);
    });
};

// 查询分页用户列表
exports.getUserList = (page, pageSize, callback) => {
    const offset = (page - 1) * pageSize;
    userModel.getUsersByPage(offset, pageSize, (err, userList) => {
        if (err) {
            return callback(new Error('查询用户列表失败'));
        }
        userModel.getUserTotal((err, total) => {
            if (err) {
                return callback(new Error('查询用户总数失败'));
            }
            callback(null, userList, total[0].total);
        });
    });
};

// 退出登陆
exports.logoutUser = (token, session, callback) => {
    global.jwtBlacklist.add(token);
    if (session && typeof session.destroy === 'function') {
        session.destroy((err) => {
            if (err) {
                console.error('Session销毁失败：', err);
                return callback(null);
            }
            callback(null);
        });
    } else {
        callback(null);
    }
};

// 删除用户
exports.removeUser = (userId, callback) => {
    if (!userId || isNaN(Number(userId)) || Number(userId) <= 0) {
        return callback(new Error('用户ID不合法，必须为正整数'));
    }
    userModel.deleteUserById(Number(userId), (err) => {
        if (err) return callback(new Error('用户删除失败：' + err.message));
        callback(null);
    });
};

// 更新用户角色（补充旧角色查询）
exports.updateUserRole = (userId, newRole, callback) => {
    if (!userId || isNaN(Number(userId))) return callback(new Error('用户ID必须是有效数字'));
    if (!userModel.isRoleValid(newRole)) return callback(new Error('角色类型无效，仅支持：visitor/user/author/admin'));

    // 查询旧角色
    userModel.getUserRoleById(userId, (err, oldRole) => {
        if (err) return callback(new Error('查询用户角色失败：' + err.message));
        if (!oldRole) return callback(new Error(`用户ID ${userId} 不存在`));
        if (oldRole === newRole) return callback(new Error('新角色与原角色一致，无需更新'));

        // 执行更新
        userModel.updateUserRole(userId, newRole, (err, result) => {
            if (err) return callback(new Error('更新角色失败：' + err.message));
            callback(null, {
                userId: Number(userId),
                oldRole: oldRole,
                newRole: newRole
            });
        });
    });
};

// ========== 修复：更新用户信息的回调判断 ==========
exports.updateUserInfo = (id, username, email, callback) => {
    if (!id || isNaN(Number(id))) {
        return callback(new Error('用户ID必须是有效数字'));
    }
    userModel.updateUserInfoById(id, username, email, (err, result) => {
        if (err) return callback(new Error('更新信息失败：' + err.message));
        // 模型层已返回affectedRows，正确判断
        if (result.affectedRows === 0) return callback(new Error(`用户ID ${id} 不存在`));
        callback(null, {username, email});
    });
};

// 搜索条件查询用户
exports.getUserListService = (params, callback) => {
    userModel.getUsersByCondition(params, (err, data) => {
        if (err) {
            return callback(`用户数据查询失败：${err.message}`, null);
        }
        callback(null, data);
    });
};

// 分配用户角色
exports.assignUserRole = (userId, newRole, callback) => {
    if (!userModel.isRoleValid(newRole)) {
        return callback(new Error('角色类型无效，仅支持：visitor/user/author/admin'));
    }
    userModel.updateUserRole(userId, newRole, (err, result) => {
        if (err) return callback(new Error('角色分配失败：' + err.message));
        if (!result) { // 模型层返回null代表失败
            return callback(new Error('用户ID不存在，角色修改失败'));
        }
        callback(null, {
            success: true,
            userId,
            newRole
        });
    });
};

// 查询用户的权限数组（变量名修正）
exports.getUserPermissions = (userId, callback) => {
    permissionModel.getUserPermissions(userId, (err, permissions) => {
        if (err) {
            return callback(err, []);
        }
        callback(null, permissions); // permissions是['user:list']格式的数组
    });
};


exports.changePassword = (userId, oldPassword, newPassword, callback) => {
    // 1. 查询用户信息（注意：确保能拿到 password 字段）
    userModel.getUserInfoById(userId, (err, user) => {
        if (err || !user) {
            return callback(new Error('用户不存在或获取失败'), null);
        }

        // ✅ 检查 user.password 是否存在
        if (!user.password_hash) {
            return callback(new Error('用户密码不存在'), null);
        }

        // 2. 验证旧密码
        const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
        if (!isMatch) {
            return callback(new Error('旧密码错误'), null);
        }

        // 3. 更新新密码
        userModel.updateUserPassword(userId, newPassword, (err, result) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, result);
        });
    });
};