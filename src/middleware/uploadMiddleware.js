const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 头像存储目录（递归创建，避免不存在）
const avatarDir = path.resolve(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true }); // recursive: true 确保父目录也创建
}

// 配置multer存储规则（仅生成临时文件，不依赖req.user）
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 回调内处理目录错误（如果有）
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        // 生成临时文件名（无用户ID）
        const ext = file.originalname.slice(file.originalname.lastIndexOf('.')) || '.png';
        const tempFileName = `avatar-temp-${Date.now()}${ext}`;
        // 挂载临时信息到req，供控制器使用
        req.tempFileName = tempFileName;
        req.fileExt = ext;
        cb(null, tempFileName);
    }
});

// 图片格式过滤（回调内处理错误）
const fileFilter = (req, file, cb) => {
    // 添加详细的日志来调试文件信息
    console.log('上传文件详细信息:');
    console.log('- 文件原始名称:', file.originalname);
    console.log('- 文件MIME类型:', file.mimetype);
    console.log('- 文件大小:', file.size);

    // 检查是否是有效的图片类型
    const acceptableMime = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];

    // 如果MIME类型是multipart/form-data，尝试通过文件扩展名判断
    if (file.mimetype === 'multipart/form-data' || file.mimetype === 'application/octet-stream') {
        // 通过文件扩展名判断
        const ext = path.extname(file.originalname).toLowerCase();
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

        if (validExtensions.includes(ext)) {
            console.log('通过文件扩展名验证类型');
            cb(null, true);
        } else {
            console.log('不支持的文件扩展名:', ext);
            cb(new Error(`仅支持JPG、PNG、GIF、WEBP格式的图片，您上传的文件扩展名是: ${ext}`), false);
        }
    } else if (acceptableMime.includes(file.mimetype)) {
        console.log('文件类型验证通过');
        cb(null, true);
    } else {
        // 记录实际的MIME类型以帮助调试
        console.log('不支持的文件类型:', file.mimetype);
        cb(new Error(`仅支持JPG、PNG、GIF、WEBP格式的图片，您上传的是: ${file.mimetype}`), false);
    }
};

// 创建multer实例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB限制
});

// 导出带错误处理的中间件
module.exports = (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    code: 400,
                    msg: '文件大小超过限制（最大2MB）',
                    data: null
                });
            }
            return res.status(400).json({
                code: 400,
                msg: err.message,
                data: null
            });
        } else if (err) {
            return res.status(400).json({
                code: 400,
                msg: err.message,
                data: null
            });
        }
        // 添加成功上传的日志
        if (req.file) {
            console.log('文件上传成功:', req.file.filename);
        }
        next();
    });
};