const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const userService = require('../services/userService');

// 初始化JWT黑名单
global.jwtBlacklist = global.jwtBlacklist || new Set();
console.log('✅ JWT黑名单初始化完成，当前黑名单数量：', global.jwtBlacklist.size);

/**
 * 检查是否为公开路径（不需要鉴权）
 * @param {string} path - 请求路径
 * @param {string} fullUrl - 完整URL
 * @returns {boolean} - 是否为公开路径
 */
const isPublicPath = (path, fullUrl) => {
    // 定义公开路径（支持多种格式）
    const publicPaths = [
        // 登录和注册接口（支持常见路径格式）
        '/auth/login',
        '/api/auth/login',
        '/login',
        '/register',
        '/api/register',

        // 静态资源（如果有）
        '/public',
        '/static',

        // 健康检查
        '/health',
        '/api/health'
    ];

    // 检查是否以这些路径开头（适用于静态资源目录）
    const publicPathPrefixes = [
        '/public/',
        '/static/',
        '/uploads/'
    ];

    // 检查精确匹配
    if (publicPaths.includes(path) || publicPaths.includes(fullUrl)) {
        return true;
    }

    // 检查路径前缀
    for (const prefix of publicPathPrefixes) {
        if (path.startsWith(prefix) || fullUrl.startsWith(prefix)) {
            return true;
        }
    }

    // 检查路径结尾（适用于动态路由）
    if (path.endsWith('/login') || path.endsWith('/register') ||
        fullUrl.endsWith('/login') || fullUrl.endsWith('/register')) {
        return true;
    }

    return false;
};

/**
 * ✅ 核心JWT鉴权中间件
 */
exports.verifyToken = (req, res, next) => {
    // 获取请求路径信息
    const requestPath = req.path;
    const fullUrl = req.originalUrl;
    const method = req.method;

    // 调试信息
    console.log('🔍 ===== JWT鉴权调试 =====');
    console.log('🔍 请求方法：', method);
    console.log('🔍 请求路径：', requestPath);
    console.log('🔍 完整URL：', fullUrl);
    console.log('🔍 Authorization头：', req.headers.authorization || '无');

    // 处理OPTIONS预检请求
    if (method === 'OPTIONS') {
        console.log('✅ OPTIONS请求，直接放行');
        return next();
    }

    // ========== 1. 检查是否为公开路径 ==========
    if (isPublicPath(requestPath, fullUrl)) {
        console.log(`✅ 公开路径 ${requestPath}，跳过鉴权`);
        return next();
    }

    // ========== 2. 校验请求头Token格式 ==========
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('❌ 未提供Authorization头');
        return res.status(401).json({
            code: 401,
            msg: '请先登录（请求头未携带Token）',
            data: null
        });
    }

    if (!authHeader.startsWith('Bearer ')) {
        console.log('❌ Authorization头格式错误，期望以Bearer开头');
        return res.status(401).json({
            code: 401,
            msg: 'Token格式错误，请使用Bearer认证',
            data: null
        });
    }

    // ========== 3. 提取Token并基础校验 ==========
    const token = authHeader.split(' ')[1];
    console.log('🔍 接收到的Token：', token ? token.substring(0, 20) + '...' : '空');

    if (!token || token === 'null' || token.trim() === '') {
        return res.status(401).json({
            code: 401,
            msg: 'Token内容无效，请重新登录',
            data: null
        });
    }

    // ========== 4. 黑名单校验 ==========
    if (global.jwtBlacklist.has(token)) {
        console.log('❌ Token在黑名单中');
        return res.status(401).json({
            code: 401,
            msg: '登录已失效/账号已退出，请重新登录',
            data: null
        });
    }

    // ========== 5. 验证Token签名 ==========
    const jwtSecret = process.env.JWT_SECRET || 'your_secure_jwt_secret_key_here';

    jwt.verify(token, jwtSecret, (verifyErr, decodedData) => {
        if (verifyErr) {
            console.error('❌ Token验证失败：', verifyErr.message);

            // 根据不同错误类型返回不同提示
            let errMsg = '登录凭证无效，请重新登录';
            if (verifyErr.name === 'TokenExpiredError') {
                errMsg = '登录凭证已过期，请重新登录';
            } else if (verifyErr.name === 'JsonWebTokenError') {
                errMsg = '登录凭证非法，请重新登录';
            }

            return res.status(401).json({
                code: 401,
                msg: errMsg,
                data: null
            });
        }

        // ========== 6. 强校验token中的用户数据 ==========
        const userId = decodedData.id ? String(decodedData.id).trim() : '';
        const username = decodedData.username ? String(decodedData.username).trim() : '';
        let role = decodedData.role ? String(decodedData.role).trim() : '';

        console.log('🔍 Token解码数据：', { userId, username, role });

        if (!userId || !username || !role) {
            return res.status(401).json({
                code: 401,
                msg: '登录凭证数据不完整，请重新登录',
                data: null
            });
        }

        role = role.toLowerCase();

        // ========== 7. 数据库校验用户信息 ==========
        userModel.getUserInfoById(userId, (dbErr, userInfo) => {
            if (dbErr) {
                console.error('❌ 数据库查询失败：', dbErr);
                return res.status(500).json({
                    code: 500,
                    msg: '服务器内部错误',
                    data: null
                });
            }

            if (!userInfo) {
                console.log(`❌ 用户ID:${userId} 不存在`);
                return res.status(401).json({
                    code: 401,
                    msg: `用户不存在或已被删除`,
                    data: null
                });
            }

            // 检查用户状态
            if (userInfo.status !== 'active') {
                const statusMap = {
                    'banned': '已被封禁',
                    'inactive': '未激活',
                    'deleted': '已删除'
                };
                const statusMsg = statusMap[userInfo.status] || '状态异常';

                return res.status(403).json({
                    code: 403,
                    msg: `账号${statusMsg}，无法操作`,
                    data: null
                });
            }

            // ========== 8. 查询用户权限列表 ==========
            userService.getUserPermissions(userId, (permErr, permissions) => {
                if (permErr) {
                    console.warn('⚠️ 查询用户权限失败（使用空权限列表）：', permErr);
                    permissions = [];
                }

                // ========== 9. 挂载完整的用户数据 ==========
                req.token = token;
                req.user = {
                    id: parseInt(userId),
                    username: username,
                    role: role,
                    status: userInfo.status,
                    permissions: permissions || [],
                    email: userInfo.email || '',
                    avatar: userInfo.avatar || ''
                };

                console.log(`✅ 用户鉴权通过：
  ├─ ID: ${userId}
  ├─ 用户名: ${username}
  ├─ 角色: ${role}
  ├─ 状态: ${userInfo.status}
  └─ 权限数量: ${req.user.permissions.length}`);

                // ✅ 进入下一个中间件
                next();
            });
        });
    });
};

/**
 * ✅ 管理员权限校验中间件
 */
exports.verifyAdmin = (req, res, next) => {
    // 先校验req.user是否存在
    if (!req.user) {
        console.log('❌ 管理员校验失败：req.user不存在');
        return res.status(403).json({
            code: 403,
            msg: '用户身份校验失败，请重新登录',
            data: null
        });
    }

    // 检查用户角色
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'admin') {
        console.log(`❌ 权限不足：${req.user.username} 尝试访问管理员接口，当前角色：${userRole}`);
        return res.status(403).json({
            code: 403,
            msg: `权限不足，需要管理员权限 | 当前角色：${userRole || '未知'}`,
            data: null
        });
    }

    console.log(`✅ 管理员权限校验通过：${req.user.username} (ID: ${req.user.id})`);
    next();
};

/**
 * ✅ 可选：特定权限校验中间件
 * @param {string|string[]} requiredPermissions - 所需权限
 */
exports.verifyPermission = (requiredPermissions) => {
    return (req, res, next) => {
        // 先确保用户已登录
        if (!req.user) {
            return res.status(403).json({
                code: 403,
                msg: '请先登录',
                data: null
            });
        }

        const userPermissions = req.user.permissions || [];
        const required = Array.isArray(requiredPermissions)
            ? requiredPermissions
            : [requiredPermissions];

        // 管理员拥有所有权限
        if (req.user.role === 'admin') {
            console.log(`✅ 管理员权限，自动放行`);
            return next();
        }

        // 检查是否拥有所需权限
        const hasPermission = required.some(perm => userPermissions.includes(perm));

        if (!hasPermission) {
            console.log(`❌ 权限不足：用户 ${req.user.username} 缺少权限 ${required.join(' 或 ')}`);
            return res.status(403).json({
                code: 403,
                msg: '没有操作权限',
                data: null
            });
        }

        console.log(`✅ 权限校验通过：${req.user.username}`);
        next();
    };
};

// 快捷别名
exports.authenticate = exports.verifyToken;