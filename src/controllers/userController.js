const userService = require('../services/userService');

/**
 * 邮箱验证
 * @param req 参数
 * @param res 响应
 * @param next 中间件
 * @returns {*} 放回数据
 */
exports.verifyUserEmail = (req, res, next) => {
    const {userId} = req.body;
    if (!userId) {
        return res.status(400).json({
            code: 400,
            msg: '缺少必填参数：userId',
            data: null // ✅ 修复笔误：date → data
        });
    }

    userService.verifyEmail(userId, (err, userData) => {
        if (err) {
            return res.status(400).json({
                code: 400,
                msg: err.message,
                data: null
            });
        }
        res.status(200).json({ // ✅ 统一写法：移除多余return
            code: 200,
            msg: '验证成功',
            data: null
        });
    })
};

/**
 * 更新个人网站
 * @param req 参数
 * @param res 响应
 * @param next 中间件
 * @returns {*} 返回数据
 */
exports.updateWebsite = (req, res, next) => {
    const {userId, website} = req.body || {};
    if (!userId) {
        return res.status(400).json({
            code: 400,
            msg: '缺少必填参数：userId',
            data: null
        });
    }

    userService.updateUserWebsite(userId, website, (err, result) => {
        if (err) {
            return res.status(400).json({
                code: 400,
                msg: err.message,
                data: null
            });
        }
        res.status(200).json({ // ✅ 统一写法：移除多余return
            code: 200,
            msg: '更新成功',
            data: {website: result.website}
        });
    })
}

/**
 * 更新用户的状态
 * @param req 参数
 * @param res 响应
 * @param next 中间件
 * @returns {*} 放回数据
 */
exports.updateStatus = (req, res, next) => {
    const {userId, status} = req.body || {};

    if (!userId) {
        return res.status(400).json({
            code: 400,
            msg: '缺少必填参数：userId',
            data: null
        });
    }
    if (!status) {
        return res.status(400).json({
            code: 400,
            msg: '缺少必填参数：status',
            data: null
        });
    }

    userService.updateUserStatus(userId, status, (err) => {
        if (err) {
            return res.status(400).json({
                code: 400,
                msg: err.message,
                data: null
            });
        }
        res.status(200).json({ // ✅ 统一写法：移除多余return
            code: 200,
            msg: '状态更新成功',
            data: null
        });
    });
};

/**
 * 获取用户列表
 * @param req 参数
 * @param res 响应
 * @param next 中间件
 */
exports.getTestUserList = (req, res, next) => {
    let page = parseInt(req.query.page);
    let pageSize = parseInt(req.query.pageSize);
    page = isNaN(page) || page < 1 ? 1 : page;
    pageSize = isNaN(pageSize) || pageSize < 1 ? 10 : pageSize;

    userService.getUserList(page, pageSize, (err, userList, total) => {
        if (err) {
            return next(err);
        }

        res.status(200).json({
            code: 200,
            msg: '查询成功',
            data: {
                list: userList,
                total,
                page,
                pageSize
            }
        });
    });
};

/**
 * 退出登录
 * @param req 参数
 * @param res 响应
 */
exports.userLogout = (req, res) => {
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

// 删除用户接口（仅管理员）✅ 修复2个致命问题+1个格式问题
exports.deleteUser = (req, res) => {
    const {userId} = req.params; // 从URL路径获取用户ID

    // ✅ 新增：userId 合法性校验，防止传空/非数字导致SQL报错
    if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({
            code: 400,
            msg: '用户ID格式错误，必须为数字',
            data: null // ✅ 修复：补充缺失的data字段
        });
    }

    // 调用Service层执行删除
    userService.removeUser(userId, (err, result) => {
        if (err) {
            // ✅ 修复：补充缺失的data字段，统一响应格式
            return res.status(400).json({
                code: 400,
                msg: err.message,
                data: null
            });
        }
        // ✅ 修复致命BUG：补充缺失的data: null，前端可正常解析
        res.status(200).json({
            code: 200,
            msg: result.msg || '用户删除成功',
            data: null
        });
    });
};


/**
 * 更新用户角色
 * @param req 参数
 * @param res 响应
 * @returns {*} 返回数据
 */
exports.updateUserRole = (req, res) => {
    const {userId, newRole} = req.body;
    // 1. 校验入参
    if (!userId) return res.status(400).json({code: 400, msg: '缺少参数：userId', data: null});
    if (!newRole) return res.status(400).json({code: 400, msg: '缺少参数：newRole', data: null});

    // 2. 调用服务层
    userService.updateUserRole(userId, newRole, (err, result) => {
        if (err) {
            return res.status(400).json({code: 400, msg: err.message, data: null});
        }
        // 3. 返回成功响应
        res.status(200).json({
            code: 200,
            msg: result.msg,
            data: {userId: result.userId, newRole: result.newRole}
        });
    });
};


/**
 * 更新用户名和邮箱
 * @param req 参数
 * @param res 响应
 */
exports.updateUserNameAndEmail = (req, res) => {
    const {id, username, email} = req.body;

    userService.updateUserInfo(id, username, email, (err, result) => {
        if (err) {
            return res.status(400).json({
                code: 400,
                msg: err.message,
                data: null
            });
        }
        res.status(200).json({
            code: 200,
            msg: '更新成功',
            data: {
                username: result.username,
                email: result.email
            }
        });
    });
}

/**
 * 搜索和分页查询用户列表
 * @param req 参数
 * @param res 相应
 */
exports.getUserListController = (req, res) => {
    const queryParams = req.query;

    // 调用业务层，回调处理结果/错误
    userService.getUserListService(queryParams, (err, data) => {
        if (err) {
            // 错误响应：和前端错误处理逻辑匹配
            return res.status(500).json({
                code: 500,
                msg: err || '用户列表查询失败'
            });
        }
        // 成功响应：格式严格对应前端接收逻辑
        res.status(200).json({
            code: 200,
            msg: '用户列表查询成功',
            data: data
        });
    });
}