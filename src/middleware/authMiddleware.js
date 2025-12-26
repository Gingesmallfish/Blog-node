const jwt = require('jsonwebtoken');
const conn = require('../config/db');

// 初始化 JWT 黑名单（内存级，全局唯一）
global.jwtBlacklist = global.jwtBlacklist || new Set();

// 整合后的鉴权中间件（验证Token+黑名单+数据库用户存在）
exports.verifyToken = (req, res, next) => {
    // 1. 校验Token是否存在
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            code: -1,
            msg: '请先登录（未携带Token）',
            data: null
        });
    }

    // 2. 提取Token并校验黑名单（退出后的Token直接拦截）
    const token = authHeader.split(' ')[1];
    console.log('接收到的Token：', token);
    if (global.jwtBlacklist.has(token)) {
        return res.status(401).json({
            code: 401,
            msg: '登录已失效，请重新登录',
            data: null
        });
    }

    // 3. 解码Token（仅格式校验）
    let decoded;
    try {
        decoded = jwt.decode(token);
    } catch (decodeErr) {
        console.error('Token解码失败：', decodeErr);
        return res.status(401).json({
            code: 401,
            msg: 'Token格式错误：' + decodeErr.message,
            data: null
        });
    }
    console.log('Token解码结果：', decoded);

    // 4. 验证Token签名（统一密钥！）
    const jwtSecret = process.env.JWT_SECRET || '你的密钥'; // 和登录生成Token的密钥保持一致
    jwt.verify(token, jwtSecret, (verifyErr, decodedData) => {
        if (verifyErr) {
            console.error('Token验证失败：', verifyErr);
            const errMsg = verifyErr.name === 'TokenExpiredError'
                ? 'Token已过期，请重新登录'
                : 'Token无效，请重新登录';
            return res.status(401).json({
                code: -1,
                msg: errMsg,
                data: null
            });
        }

        // 5. 提取用户ID并校验数据库
        const userId = decodedData.id;
        if (!userId) {
            return res.status(401).json({
                code: -1,
                msg: 'Token中无用户ID',
                data: null
            });
        }

        // 6. 查询数据库验证用户存在
        const sql = 'SELECT id FROM users WHERE id = ?';
        conn.query(sql, [userId], (dbErr, results) => {
            if (dbErr) {
                console.error('数据库查询失败：', dbErr);
                return res.status(500).json({
                    code: 500,
                    msg: '服务器内部错误（数据库查询失败）',
                    data: null
                });
            }
            if (results.length === 0) {
                return res.status(401).json({
                    code: -1,
                    msg: `用户不存在（ID：${userId}）`,
                    data: null
                });
            }

            // 7. 挂载用户信息和Token（供退出接口使用）
            req.user = { id: results[0].id }; // 数据库真实用户ID
            req.token = token; // 保存Token，退出时拉黑
            next(); // 鉴权通过，执行退出逻辑
        });
    });
};