const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// 初始化JWT黑名单（内存级，全局唯一）
global.jwtBlacklist = global.jwtBlacklist || new Set();
console.log('✅ JWT黑名单初始化完成，当前黑名单数量：', global.jwtBlacklist.size);

// ✅ 整合鉴权中间件：修复slice报错+类型强校验+全兼容兜底
exports.verifyToken = (req, res, next) => {
    // 1. 校验请求头Token格式
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            code: 401,
            msg: '请先登录（请求头未携带有效Token）',
            data: null
        });
    }

    // 2. 提取Token并基础校验（仅保留核心校验，杜绝误拦截）
    const token = authHeader.split(' ')[1];
    console.log('🔍 接收到的Token：', token);
    if (!token || token === 'null' || token.trim() === '') {
        return res.status(401).json({
            code: 401,
            msg: 'Token格式无效，请重新登录',
            data: null
        });
    }

    // 3. 黑名单校验
    if (global.jwtBlacklist.has(token)) {
        return res.status(401).json({
            code: 401,
            msg: '登录已失效/账号已退出，请重新登录',
            data: null
        });
    }

    // 4. 验证Token签名 + ✅ 新增异常捕获，防止解码崩溃
    const jwtSecret = process.env.JWT_SECRET || 'your_secure_jwt_secret_key_here';
    jwt.verify(token, jwtSecret, (verifyErr, decodedData) => {
        // ===== ✅ 修复1：全局捕获JWT解码异常，避免程序崩溃 =====
        if (verifyErr) {
            console.error('❌ Token验证失败：', verifyErr);
            const errMsg = verifyErr.name === 'TokenExpiredError'
                ? '登录凭证已过期，请重新登录'
                : '登录凭证无效，请重新登录';
            return res.status(401).json({ code: 401, msg: errMsg, data: null });
        }
        // ===== ✅ 修复2：强校验+类型强制转换，根治slice报错 =====
        // 兜底空值 + 强制转换为指定类型，确保后续操作安全
        const userId = decodedData.id ? String(decodedData.id).trim() : '';
        const username = decodedData.username ? String(decodedData.username).trim() : '';
        let role = decodedData.role ? String(decodedData.role).trim() : '';

        // 校验核心字段非空
        if (!userId || !username || !role) {
            return res.status(401).json({
                code: 401,
                msg: '登录凭证数据残缺，无法完成校验',
                data: null
            });
        }
        // ✅ 关键：role转小写前，先确保是字符串 → 彻底解决slice is not a function
        role = role.toLowerCase();

        // 5. 数据库校验用户信息+状态
        userModel.getUserInfoById(userId, (dbErr, userInfo) => {
            if (dbErr) {
                console.error('❌ 数据库用户校验失败：', dbErr);
                return res.status(500).json({ code:500, msg:'服务器内部错误', data:null });
            }
            if (!userInfo) {
                return res.status(401).json({ code:401, msg:`用户ID:${userId} 不存在`, data:null });
            }
            // 账号状态校验
            if (userInfo.status !== 'active') {
                return res.status(403).json({
                    code: 403,
                    msg: `账号已${userInfo.status === 'banned' ? '封禁' : '未激活'}，无法操作`,
                    data: null
                });
            }

            // 6. 安全挂载数据（所有字段均为安全类型）
            req.token = token;
            req.user = {
                id: parseInt(userId), // 强制转数字，适配数据库ID
                username: username,
                role: role, // 已确保是小写字符串
                status: userInfo.status
            };
            console.log(`✅ 用户鉴权通过：ID=${userId}，用户名=${username}，角色=${role}`);
            next();
        });
    });
};

// ✅ 管理员权限校验中间件（同步加固，杜绝类型异常）
exports.verifyAdmin = (req, res, next) => {
    if (!req.user || typeof req.user !== 'object') {
        return res.status(403).json({ code:403, msg:'用户身份校验失败', data:null });
    }
    // ✅ 双重兜底：确保role是字符串+小写匹配
    const userRole = req.user.role ? String(req.user.role).toLowerCase() : '';
    if (userRole !== 'admin') {
        return res.status(403).json({
            code: 403,
            msg: `权限不足！仅管理员可操作 | 当前角色：${userRole || '未知'}`,
            data: null
        });
    }
    console.log(`✅ 管理员权限校验通过：${req.user.username}`);
    next();
};