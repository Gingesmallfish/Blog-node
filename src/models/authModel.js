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
        userData.status || 'inactive', // 补充默认值
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

/**
 * 3. 根据用户名或邮箱查询用户（供登录业务使用）
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


//
exports.updateLastLogin  = (userId, callback) => {
    const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
    conn.query(sql, [userId], (err, result) => {
        if (err) {
            console.log('模型层：更新最后登录时间失败', err);
            return callback(err, null);
        }
        callback(null, result);
    });
};

/**
 * 4. 根据用户ID检查用户是否存在（供Token验证使用）
 * @param userId 用户ID
 * @param callback 回调函数
 */
exports.checkUserExistsById = (userId, callback) => {
    const sql = 'SELECT id FROM users WHERE id = ?';
    conn.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('模型层：查询用户ID是否存在失败', err);
            return callback(err, null);
        }
        const userExists = results.length > 0;
        callback(null, userExists);
    });
};
