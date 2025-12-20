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

// 2. 插入新用户（供注册业务使用）
exports.createUser = (userData, callback) => {
    const sql = `
        INSERT INTO users
            (username, email, password_hash, role, status, email_verified)
        VALUES (?, ?, ?, ?, 'active', false)
    `;
    const params = [
        userData.username,
        userData.email,
        userData.passwordHash,
        userData.role
    ];
    conn.query(sql, params, (err, result) => {
        if (err) {
            console.log('模型层：插入用户数据失败', err);
            return callback(err, null);
        }
        callback(null, result); // 回调返回插入结果（包含insertId）
    });
};




// 3. 查询所有用户（供 /text 接口使用）
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