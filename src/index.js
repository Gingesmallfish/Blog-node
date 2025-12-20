const express = require('express');
const userRoutes = require('./api/userApi');
const userMiddleware = require('./middleware/userMiddleware');
const session = require('express-session');
const app = express();
const port = 3000;

// 1. 全局中间件
app.use(express.json()); // 解析 JSON 请求体

// 配置Session
app.use(session({
    secret: 'your_jwt_secret', // 用于加密 Session 的密钥（生产环境需更换为复杂值）
    resave: false,             // 不强制重新保存未修改的 Session
    saveUninitialized: false,  // 不保存未初始化的 Session
    cookie: {
        secure: false,           // 开发环境设为 false（http），生产环境需设为 true（https）
        maxAge: 24 * 60 * 60 * 1000 // Session 有效期（1天）
    }
}))



app.use(express.urlencoded({ extended: false })); // 解析 URL 编码请求体


// 2. 挂载用户路由
app.use('/api', userRoutes);


// 3. 挂载全局异常处理中间件（必须放在路由挂载之后，且需4个参数）
app.use(userMiddleware.errorHandler);

app.listen(port, () => {
    console.log(`服务器在端口 ${port} 上运行`);
});

module.exports = app;