// 1. 导入依赖和项目模块
const request = require('supertest'); // 导入 supertest
const app = require('../index'); // 导入 Express app 实例
const conn = require('../config/db'); // 导入数据库连接实例

// 2. 测试后置操作：关闭数据库连接（清理资源，避免残留）
afterAll((done) => {
    conn.end((err) => {
        if (err) {
            console.error('关闭数据库连接失败:', err);
            done(err);
            return;
        }
        console.log('测试完成，数据库连接已关闭');
        done();
    });
});

// 3. 核心测试用例：测试 /text 接口查询成功场景
test('GET /text 接口应成功返回 users 表数据（状态码200）', (done) => {
    // 使用 supertest 发送 GET 请求，回调风格处理响应（无需 Promise）
    request(app)
        .get('/text') // 接口路径
        .expect('Content-Type', /json|plain/) // 断言响应类型（返回数组可能是 json 或 plain）
        .expect(200) // 先断言成功状态码 200
        .end((err, res) => { // 回调函数：接收请求结果（核心，非 Promise 风格）
            // 1. 若请求本身出错（如服务器启动失败），直接标记测试失败
            if (err) {
                return done(err);
            }

            // 2. 断言响应数据（确保查询结果有效）
            const result = res.body; // 响应数据（若返回 JSON 则自动解析，若为数组则直接获取）

            // 断言1：返回数据是数组（数据库查询结果默认是数组）
            expect(result).toBeInstanceOf(Array);

            // 断言2：数组长度大于0（可选，若 users 表有数据则启用）
            // expect(result.length).toBeGreaterThan(0);

            // 断言3：若有数据，验证字段结构（可选，根据你的 users 表字段调整）
            if (result.length > 0) {
                expect(result[0]).toHaveProperty('id'); // 假设 users 表有 id 字段
                // expect(result[0]).toHaveProperty('username'); // 可添加其他字段断言
            }

            // 3. 手动调用 done()，告诉 Jest 异步测试完成
            done();
        });
});

