const jwt = require('jsonwebtoken');
const conn = require('../config/db');

exports.verifyToken = (req, res, next) => {
    // 同步逻辑：判断Token是否存在
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            code: -1,
            msg: '请先登录（未携带Token）',
            data: null
        });
    }

    const token = authHeader.split(' ')[1];
    console.log('接收到的Token：', token);

    // 同步解码Token（仅解析，不验证签名）
    let decoded;
    try { // 这里的try/catch仅用于解码Token（同步操作），若你连这个都不想用，可注释（但可能崩）
        decoded = jwt.decode(token);
    } catch (decodeErr) {
        console.error('Token解码失败：', decodeErr);
        return res.status(401).json({
            code: -1,
            msg: 'Token格式错误：' + decodeErr.message,
            data: null
        });
    }
    console.log('Token解码结果：', decoded);

    // 异步验证Token签名 + 查询数据库
    jwt.verify(token, process.env.JWT_SECRET || '你的密钥', (verifyErr, decodedData) => {
        // 回调内处理Token验证错误
        if (verifyErr) {
            console.error('Token验证失败：', verifyErr);
            return res.status(401).json({
                code: -1,
                msg: 'Token无效/已过期：' + verifyErr.message,
                data: null
            });
        }

        // 提取用户ID（匹配Token里的id字段）
        const userId = decodedData.id;
        if (!userId) {
            return res.status(401).json({
                code: -1,
                msg: 'Token中无用户ID',
                data: null
            });
        }

        // 异步查询数据库
        const sql = 'SELECT id FROM users WHERE id = ?';
        conn.query(sql, [userId], (dbErr, results) => {
            // 回调内处理数据库错误
            if (dbErr) {
                console.error('数据库查询失败：', dbErr);
                return res.status(500).json({
                    code: 500,
                    msg: '数据库查询失败：' + dbErr.message,
                    data: null
                });
            }
            // 判断用户是否存在
            if (results.length === 0) {
                return res.status(401).json({
                    code: -1,
                    msg: `用户不存在（ID：${userId}）`,
                    data: null
                });
            }

            // 挂载用户ID，执行下一步
            req.user = { id: results[0].id };
            next();
        });
    });
};