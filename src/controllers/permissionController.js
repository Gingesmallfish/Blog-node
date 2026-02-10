// controllers/permissionController.js
const permissionService = require('../services/permissionService');

// 分配权限
exports.assignPermission = (req, res) => {
    const { userId, permCode } = req.body;

    permissionService.assignPermission(userId, permCode, (err, result) => {
        if (err) {
            return res.status(500).json({
                code: 500,
                msg: err.message || '分配权限失败'
            });
        }

        res.status(200).json({
            code: 200,
            msg: result.message || '权限分配成功',
            data: result
        });
    });
};

// 回收权限
exports.revokePermission = (req, res) => {
    const { userId, permCode } = req.body;

    permissionService.revokePermission(userId, permCode, (err, result) => {
        if (err) {
            // 无权限可回收时返回400，而非500
            if (err.message.includes('未拥有此权限')) {
                return res.status(400).json({
                    code: 400,
                    msg: err.message
                });
            }
            return res.status(500).json({
                code: 500,
                msg: '回收权限失败：' + err.message
            });
        }

        res.status(200).json({
            code: 200,
            msg: '权限回收成功',
            data: result
        });
    });
};

// 查询用户已拥有的权限
exports.getUserPermissions = (req, res) => {
    const { userId } = req.query; // 注意是query参数（GET请求）

    permissionService.getUserPermissions(userId, (err, result) => {
        if (err) {
            return res.status(500).json({
                code: 500,
                msg: '查询用户权限失败：' + err.message
            });
        }

        res.status(200).json({
            code: 200,
            msg: '查询成功',
            data: result
        });
    });
};

// 查询所有权限
exports.getAllPermissions = (req, res) => {
    permissionService.getAllPermissions((err, result) => {
        if (err) {
            return res.status(500).json({
                code: 500,
                msg: '查询所有权限失败：' + err.message
            });
        }

        res.status(200).json({
            code: 200,
            msg: '查询成功',
            data: result
        });
    });
};



// 按模块分组查询所有权限
exports.getAllPermissionsGrouped = (req, res) => {
    permissionService.getAllPermissionsGrouped((err, result) => {
        if (err) {
            return res.status(500).json({
                code: 500,
                msg: '分组查询权限失败：' + err.message
            });
        }

        res.status(200).json({
            code: 200,
            msg: '分组查询权限成功',
            data: result
        });
    });
};