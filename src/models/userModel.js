const conn = require('../config/db');

// 2. 更新邮箱验证状态【修复：补充 isVerified 参数，匹配服务层调用】
exports.updateEmailVerified = (userId, isVerified, callback) => {
    const sql = 'UPDATE users SET email_verified = ? WHERE id = ?';
    conn.query(sql, [isVerified, userId], (err, result) => {
        if (err) {
            console.log('模型层：更新邮箱验证状态失败', err);
            return callback(err, null);
        }
        if (result.affectedRows === 0) {
            return callback(new Error('用户不存在'), null);
        }
        callback(null, result);
    });
};

// 3. 更新个人网站
exports.updateUserWebsite = (userId, website, callback) => {
    const sql = 'UPDATE users SET website = ? WHERE id = ?';
    conn.query(sql, [website, userId], (err, result) => {
        if (err) {
            console.log('模型层：更新用户网站失败', err);
            return callback(err, null);
        }
        if (result.affectedRows === 0) {
            return callback(new Error('用户不存在'), null);
        }
        callback(null, result);
    });
};

// 5. 更新用户最后登录时间


// 6. 查询用户状态（可选，也可通过 findUserByUsernameOrEmail 直接获取）
exports.getUserStatus = (userId, callback) => {
    const sql = 'SELECT status FROM users WHERE id = ?';
    conn.query(sql, [userId], (err, result) => {
        if (err) {
            console.log('模型层：查询用户状态失败', err);
            return callback(err, null);
        }
        callback(null, result[0]?.status);
    });
};


// 7. 更新用户状态（供管理员操作使用）
exports.updateUserStatus = (userId, status, callback) => {
    const sql = 'UPDATE users SET status = ? WHERE id = ?';
    conn.query(sql, [status, userId], (err, result) => {
        if (err) {
            console.log('模型层：更新用户状态失败', err);
            return callback(err, null);
        }
        callback(null, result);
    });
};


exports.getUserInfoById = (userId, callback) => {
    // 仅查询鉴权所需的核心字段，提升查询效率
    const sql = 'SELECT id, username, role, status FROM users WHERE id = ? LIMIT 1';
    // 确保userId是数字，避免SQL报错
    const queryId = parseInt(userId);

    if (isNaN(queryId) || queryId < 1) {
        const err = new Error(`用户ID非法，必须为正整数 → 当前值：${userId}`);
        return callback(err, null);
    }

    // 执行SQL查询
    conn.query(sql, [queryId], (err, results) => {
        if (err) {
            console.error('❌ userModel-getUserInfoById：查询失败 →', err);
            return callback(err, null);
        }
        // 查询结果为空 → 用户不存在
        if (results.length === 0) {
            return callback(null, null);
        }
        // 查询成功 → 返回用户信息
        callback(null, results[0]);
    });
};

// 分页查询用户（你的代码完全正确，直接保留）
exports.getUsersByPage = (offset, pageSize, callback) => {
    const sql = 'select * from users limit ? offset ?;';
    conn.query(sql, [pageSize, offset], (err, result) => {
        if (err) {
            console.log('模型层：分页查询用户失败', err);
            return callback(err, null);
        }
        callback(null, result);
    });
};

// 查询用户总条数（你的代码完全正确，直接保留）
exports.getUserTotal = (callback) => {
    const sql = 'select count(*) as total from users;';
    conn.query(sql, (err, result) => {
        if (err) {
            console.log('模型层：查询用户总数失败', err);
            return callback(err, null);
        }
        callback(null, result);
    });
};

// 8. 查询所有用户（保留，不影响分页）
exports.getAllUsers = (callback) => {
    const sql = 'select * from users;';
    conn.query(sql, (err, result) => {
        if (err) {
            console.log('模型层：查询所有用户失败', err);
            return callback(err, null);
        }
        callback(null, result); // 回调返回用户列表
    });
};

//
// 根据ID删除用户（物理删除，生产可改逻辑删除）
/**
 * 删除用户
 * @param userId
 * @param callback
 */
exports.deleteUserById = (userId, callback) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    conn.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('删除用户失败（数据库）：', err);
            return callback(err, null);
        }
        // 校验是否删除成功（影响行数>0）
        if (result.affectedRows === 0) {
            return callback(new Error('用户ID不存在，删除失败'), null);
        }
        callback(null, {msg: '用户删除成功', affectedRows: result.affectedRows});
    });
};


/**
 * 更新用户角色 - 只有管理员可操作
 * @param userId
 * @param newRole
 * @param callback
 * @returns {*}
 */
exports.updateUserRole = (userId, newRole, callback) => {
    // 1. 校验角色合法性（与数据库ENUM一致）
    const validRoles = ['visitor', 'user', 'author', 'admin'];
    if (!validRoles.includes(newRole)) {
        const err = new Error(`角色非法！仅支持：${validRoles.join('/')}`);
        return callback(err, null);
    }
    // 2. 校验用户ID合法性
    const queryId = parseInt(userId);
    if (isNaN(queryId) || queryId < 1) {
        const err = new Error(`用户ID非法，必须为正整数`);
        return callback(err, null);
    }
    // 3. 执行SQL更新
    const sql = `
        UPDATE users
        SET role       = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    conn.query(sql, [newRole, queryId], (err, result) => {
        if (err) {
            console.error('更新用户角色失败：', err);
            return callback(err, null);
        }
        // 4. 判断是否更新成功（无数据变更/用户不存在）
        if (result.affectedRows === 0) {
            const err = new Error(`更新失败！用户ID=${queryId} 不存在或角色未变更`);
            return callback(err, null);
        }
        // 5. 返回成功数据
        callback(null, {
            userId: queryId, newRole: newRole, msg: `用户ID=${queryId} 角色已更新为：${newRole}`
        });
    });
};


/**
 * 更新用户信息
 * @param id 用户ID
 * @param username 用户名
 * @param email 邮箱
 * @param callback callback 回调函数 (err, result)
 */
exports.updateUserInfoById = (id, username, email, callback) => {
    const sql = 'UPDATE users SET username = ?, email = ? WHERE id = ?';
    conn.query(sql, [username, email, id], (err, result) => {
        if (err) {
            console.error('更新用户信息失败：', err);
            return callback(err, null);
        }
        // 4. 判断是否更新成功（无数据变更/用户不存在）
        if (result.affectedRows === 0) {
            const err = new Error(`更新失败！用户ID=${id} 不存在或信息未变更`);
            return callback(err, null);
        }
        // 5. 返回成功数据
        callback(null, {
            id: id, username: username, email: email, msg: `用户ID=${id} 信息已更新`
        })
    })
}


/**
 * 按条件查询用户列表【纯回调写法】
 * @param {Object} params 查询参数 {keyword,status,role,page,pageSize}
 * @param {Function} callback 回调函数 (err, result) => {}
 */

// ✅ 完全保留你的 exports + 箭头函数写法，零改动
exports.getUsersByCondition = (params, callback) => {
    // 解构参数 + 设置默认值，和前端完全对应（你的代码原样保留）
    const {
        keyword = '', status = '', role = '', page = 1, pageSize = 10
    } = params;

    // ✅ 修复：page/pageSize强制转数字，避免偏移量计算出错
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum; // MySQL分页核心：偏移量

    // ✅ 构建查询条件 & 防SQL注入参数数组（你的代码原样保留）
    let whereSql = 'WHERE 1=1';
    const queryParams = [];

    // 用户名/邮箱 模糊搜索
    if (keyword) {
        whereSql += ' AND (username LIKE ? OR email LIKE ?)';
        queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    // 用户状态 精准筛选
    if (status) {
        whereSql += ' AND status = ?';
        queryParams.push(status);
    }
    // 用户角色 精准筛选
    if (role) {
        whereSql += ' AND role = ?';
        queryParams.push(role);
    }

    // 1. 第一步：查询符合条件的【总条数】（用于前端分页）
    const countSql = `SELECT COUNT(*) AS total
                      FROM users ${whereSql}`;
    // ✅ 直接用你的单连接 conn.query，完美匹配！
    conn.query(countSql, queryParams, (countErr, countResult) => {
        if (countErr) return callback(countErr, null); // 错误向上传递
        const total = countResult[0].total;

        // 2. 第二步：查询【当前页数据】（分页+倒序）
        const listSql = `
            SELECT *
            FROM users ${whereSql}
            ORDER BY created_at DESC
            LIMIT ?, ?
        `;
        const listParams = [...queryParams, offset, sizeNum];
        // ✅ 同样用单连接 conn.query
        conn.query(listSql, listParams, (listErr, list) => {
            if (listErr) return callback(listErr, null);
            // ✅ 返回前端需要的完整数据格式（和前端无缝对接）
            callback(null, {
                list, total, page: pageNum, pageSize: sizeNum
            });
        });
    });
};

