const {query} = require("../config/db");
exports.checkPermission = (requiredPerm) => {
    return (req, res, next) => {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ code: 401, msg: '请先登录' });
        }

        // ✅ 强制admin直接放行（不管permissions是否为空）
        const userRole = (req.user.role || '').toLowerCase();
        if (userRole === 'admin') {
            console.log(`✅ 管理员${req.user.username}直接放行，跳过权限校验`);
            return next();
        }

        // 普通用户才查权限
        const sql = `SELECT permission_code FROM user_permissions WHERE user_id = ?`;
        query(sql, [req.user.id], (err, perms) => {
            if (err) return res.status(500).json({ code: 500, msg: '权限校验失败：' + err.message });
            const userPerms = (perms || []).map(item => item?.permission_code || '');

            if (userPerms.includes(requiredPerm)) {
                return next();
            }
            res.status(403).json({ code: 403, msg: `缺少权限：${requiredPerm}` });
        });
    };
};

// 保留原有checkAdmin
exports.checkAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ code: 401, msg: '请先登录' });
    }
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'admin') {
        return res.status(403).json({ code: 403, msg: '仅管理员可操作' });
    }
    next();
};