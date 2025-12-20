const express = require('express');
const userRoutes = require('./api/userApi');
const userMiddleware = require('./middleware/userMiddleware');
const app = express();
const port = 3000;

// 1. 全局中间件
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: false })); // 解析 URL 编码请求体

// 2. 挂载用户路由
app.use('/api', userRoutes);


// 3. 挂载全局异常处理中间件（必须放在路由挂载之后，且需4个参数）
app.use(userMiddleware.errorHandler);

app.listen(port, () => {
    console.log(`服务器在端口 ${port} 上运行`);
});

module.exports = app;