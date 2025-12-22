const conn = require('../config/db');

// 1. 检查用户名/邮箱是否已存在（供注册业务使用）
exports.checkUserExists = (username, email, callback) => {
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    conn.query(sql, [username, email], (err, result) => {
        if (err) {
            console.log('模型层：查询用户是否存在失败', err);
            return callback(err, null);
        }
        callback(null, result); // 回调返回查询结果
    });
};

// 2. 插入新用户（供注册业务使用）【修复：拼写错误 wesite → website】
exports.createUser = (userData, callback) => {
    const sql = `
        INSERT INTO users
            (username, email, password_hash, role, status, email_verified, website)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        userData.username,
        userData.email,
        userData.passwordHash,
        userData.role || 'user', // 补充默认值，避免参数为 undefined
        userData.status || 'active', // 补充默认值
        userData.emailVerified || false, // 邮箱验证默认值设为false
        userData.website || null // 修复：wesite → website
    ];
    conn.query(sql, params, (err, result) => {
        if (err) {
            console.log('模型层：插入用户数据失败', err);
            return callback(err, null);
        }
        callback(null, result); // 回调返回插入结果（包含insertId）
    });
};

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

/**
 * 4. 根据用户名或邮箱查询用户（供登录业务使用）
 * @param usernameOrEmail 用户名或邮箱
 * @param callback 回调函数
 */
exports.findUserByUsernameOrEmail = (usernameOrEmail, callback) => {
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    conn.query(sql, [usernameOrEmail, usernameOrEmail], (err, result) => {
        if (err) {
            console.log('模型层：登录查询用户失败', err);
            return callback(err, null);
        }
        callback(null, result[0]); // 返回查询到的用户（无则为null）
    });
};

// 5. 更新用户最后登录时间
exports.updateLastLogin = (userId, callback) => {
    const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
    conn.query(sql, [userId], (err, result) => {
        if (err) {
            console.log('模型层：更新最后登录时间失败', err);
            return callback(err, null);
        }
        callback(null, result);
    });
};

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

// 8. 查询所有用户（供 /text 接口使用）【修复：方法编号冲突（原3→8），避免混淆】
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