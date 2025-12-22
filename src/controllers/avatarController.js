// controllers/avatarController.js
const fs = require('fs');
const path = require('path');
const avatarModel = require('../models/avatarModel');

// 纯回调风格，无try/catch、无Promise
exports.uploadAvatar = (req, res) => {
    console.log('进入 uploadAvatar 控制器');
    console.log('req.file:', req.file);
    console.log('req.user:', req.user);

    // 1. 同步判断：文件是否上传
    if (!req.file) {
        console.log('错误: 没有文件上传');
        return res.status(400).json({
            code: 400,
            msg: '请选择头像文件',
            data: null
        });
    }

    // 2. 同步判断：用户ID是否存在
    const userId = req.user?.id;
    if (!userId) {
        console.log('错误: 用户ID不存在');
        return res.status(400).json({
            code: 400,
            msg: '用户ID不存在',
            data: null
        });
    }

    // 打印关键信息
    console.log('上传文件信息：', req.file);
    console.log('用户ID：', userId);
    console.log('临时文件名：', req.tempFileName);
    console.log('文件扩展名：', req.fileExt);

    // 3. 构造文件路径（同步）
    const tempPath = req.file.path; // 临时文件完整路径
    const ext = req.fileExt || path.extname(req.file.originalname) || '.png';
    const newFileName = `avatar-${userId}-${Date.now()}${ext}`;
    const newPath = path.join(path.dirname(tempPath), newFileName);
    const avatarUrl = `http://localhost:3000/uploads/avatars/${newFileName}`;

    // 4. 异步：重命名文件（回调处理错误）
    fs.rename(tempPath, newPath, (renameErr) => {
        if (renameErr) {
            console.error('文件重命名失败：', renameErr);

            // 尝试删除临时文件
            fs.unlink(tempPath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('删除临时文件失败：', unlinkErr);
                }
            });

            return res.status(500).json({
                code: 500,
                msg: '文件重命名失败：' + renameErr.message,
                data: null
            });
        }

        console.log('文件重命名成功：', newFileName);

        // 5. 使用模型更新数据库
        avatarModel.updateUserAvatar(userId, avatarUrl, (dbErr, result) => {
            if (dbErr) {
                console.error('数据库操作失败：', dbErr);

                // 根据错误类型返回不同的状态码
                if (dbErr.code === 'USER_NOT_FOUND') {
                    // 如果数据库更新失败，删除已重命名的文件
                    fs.unlink(newPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error('删除已重命名文件失败：', unlinkErr);
                        }
                    });

                    return res.status(400).json({
                        code: 400,
                        msg: dbErr.message,
                        data: null
                    });
                }

                // 数据库其他错误
                return res.status(500).json({
                    code: 500,
                    msg: '数据库更新失败：' + dbErr.message,
                    data: null
                });
            }

            // 6. 成功响应
            console.log('头像上传成功，URL:', avatarUrl);
            res.json({
                code: 200,
                msg: '头像上传成功',
                data: {
                    avatar: avatarUrl,
                    affectedRows: result.affectedRows
                }
            });
        });
    });
};

/**
 * 获取用户头像信息
 */
exports.getAvatar = (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(400).json({
            code: -1,
            msg: '用户ID不存在',
            data: null
        });
    }

    avatarModel.getUserAvatar(userId, (err, avatarUrl) => {
        if (err) {
            if (err.code === 'USER_NOT_FOUND') {
                return res.status(404).json({
                    code: 404,
                    msg: err.message,
                    data: null
                });
            }

            return res.status(500).json({
                code: 500,
                msg: '获取头像失败：' + err.message,
                data: null
            });
        }

        res.json({
            code: 200,
            msg: '获取成功',
            data: { avatar: avatarUrl }
        });
    });
};

/**
 * 删除头像（可选功能）
 */
exports.deleteAvatar = (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(400).json({
            code: -1,
            msg: '用户ID不存在',
            data: null
        });
    }

    // 先获取当前头像URL
    avatarModel.getUserAvatar(userId, (getErr, currentAvatarUrl) => {
        if (getErr) {
            return res.status(500).json({
                code: 500,
                msg: '获取当前头像失败：' + getErr.message,
                data: null
            });
        }

        // 如果没有头像，直接返回成功
        if (!currentAvatarUrl) {
            return res.json({
                code: 200,
                msg: '用户没有头像',
                data: null
            });
        }

        // 删除服务器上的文件
        const fileName = currentAvatarUrl.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/avatars', fileName);

        fs.unlink(filePath, (unlinkErr) => {
            // 即使文件删除失败，也继续更新数据库
            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                console.error('删除头像文件失败：', unlinkErr);
            }

            // 更新数据库，将avatar设置为null
            avatarModel.updateUserAvatar(userId, null, (updateErr, result) => {
                if (updateErr) {
                    return res.status(500).json({
                        code: 500,
                        msg: '删除头像失败：' + updateErr.message,
                        data: null
                    });
                }

                res.json({
                    code: 200,
                    msg: '头像删除成功',
                    data: { affectedRows: result.affectedRows }
                });
            });
        });
    });
};