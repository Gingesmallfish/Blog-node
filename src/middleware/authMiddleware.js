const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const userService = require('../services/userService');

// 初始化JWT黑名单
global.jwtBlacklist = global.jwtBlacklist || new Set();
console.log('✅ JWT黑名单初始化完成，当前黑名单数量：', global.jwtBlacklist.size);

// ✅ 核心JWT鉴权中间件（修复异步执行顺序 + 新增白名单）
exports.verifyToken = (req, res, next) => {
    // ========== 新增：白名单逻辑（跳过登录/注册接口） ==========
    // 定义不需要鉴权的接口路径（根据你的实际路由调整）
    const whiteList = [
        '/api/auth/login',    // 登录接口
        '/api/auth/register'  // 注册接口
    ];
    
    // 检查当前请求路径是否在白名单中，在则直接放行
    if (whiteList.includes(req.path)) {
        console.log(`✅ 请求路径 ${req.path} 在白名单，跳过鉴权`);
        return next();
    }

    // 1. 校验请求头Token格式
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            code: 401,
            msg: '请先登录（请求头未携带有效Token）',
            data: null
        });
    }

    // 2. 提取Token并基础校验
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

    // 4. 验证Token签名 + 异常捕获
    const jwtSecret = process.env.JWT_SECRET || 'your_secure_jwt_secret_key_here';
    jwt.verify(token, jwtSecret, (verifyErr, decodedData) => {
        if (verifyErr) {
            console.error('❌ Token验证失败：', verifyErr);
            const errMsg = verifyErr.name === 'TokenExpiredError'
                ? '登录凭证已过期，请重新登录'
                : '登录凭证无效，请重新登录';
            return res.status(401).json({code: 401, msg: errMsg, data: null});
        }

        // 强校验+类型强制转换
        const userId = decodedData.id ? String(decodedData.id).trim() : '';
        const username = decodedData.username ? String(decodedData.username).trim() : '';
        let role = decodedData.role ? String(decodedData.role).trim() : '';

        if (!userId || !username || !role) {
            return res.status(401).json({
                code: 401,
                msg: '登录凭证数据残缺，无法完成校验',
                data: null
            });
        }
        role = role.toLowerCase();

        // 5. 数据库校验用户信息+状态
        userModel.getUserInfoById(userId, (dbErr, userInfo) => {
            if (dbErr) {
                console.error('❌ 数据库用户校验失败：', dbErr);
                return res.status(500).json({code: 500, msg: '服务器内部错误', data: null});
            }
            if (!userInfo) {
                return res.status(401).json({code: 401, msg: `用户ID:${userId} 不存在`, data: null});
            }
            if (userInfo.status !== 'active') {
                return res.status(403).json({
                    code: 403,
                    msg: `账号已${userInfo.status === 'banned' ? '封禁' : '未激活'}，无法操作`,
                    data: null
                });
            }

            // 6. 查询用户的权限列表（异步操作）
            userService.getUserPermissions(userId, (permErr, permissions) => {
                if (permErr) {
                    console.warn('⚠️ 查询用户权限失败（兜底空数组）：', permErr);
                    permissions = [];
                }

                // 7. 安全挂载完整的用户数据（包含权限）
                req.token = token;
                req.user = {
                    id: parseInt(userId),
                    username: username,
                    role: role, // 已转小写
                    status: userInfo.status,
                    permissions: permissions || [] // 兜底空数组
                };

                console.log(`✅ 用户鉴权通过：
                  ID=${userId}，用户名=${username}，角色=${role}，
                  权限列表=${JSON.stringify(req.user.permissions)}`);

                // ✅ 核心修复：将next()移到异步回调内部！
                // 确保req.user完全赋值后，再进入下一个中间件
                next();
            });
        });
    });
};

// ✅ 管理员权限校验中间件（优化）
exports.verifyAdmin = (req, res, next) => {
    // 先校验req.user是否存在
    if (!req.user || typeof req.user !== 'object') {
        return res.status(403).json({
            code: 403,
            msg: '用户身份校验失败，请重新登录',
            data: null
        });
    }

    // 角色转小写（双重兜底）
    const userRole = (req.user.role || '').toLowerCase();
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

// 快捷别名
exports.authenticate = exports.verifyToken;