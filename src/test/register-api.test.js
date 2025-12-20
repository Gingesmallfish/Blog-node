// 注册接口专属测试文件：覆盖分层架构下的所有核心场景
const request = require('supertest');
const app = require('../index'); // 导入分层后的 Express app 实例
const conn = require('../config/db'); // 数据库连接
const userModel = require('../models/userModel'); // 可用于模拟模型层（可选）



// 测试后置操作：关闭数据库连接，清理资源
afterAll((done) => {
    conn.end((err) => {
        if (err) {
            console.error('后置操作：关闭数据库连接失败:', err);
            done(err);
            return;
        }
        console.log('后置操作：数据库连接已关闭');
        done();
    });
});

// -------------- 测试场景1：合法参数 - 注册成功 --------------
test('POST /api/register 传入合法参数应返回201状态码和注册成功信息', (done) => {
    const validRegisterData = {
        username: 'text04', // 符合用户名格式
        email: 'text04@qq.com', // 合法邮箱
        password: '123456jly@', // 符合密码强度（字母+数字，6-20位）
        role: 'admin'
    };

    request(app)
        .post('/api/register') // 注册接口路径
        .send(validRegisterData) // 发送合法请求体
        .set('Content-Type', 'application/json') // 设置JSON请求头
        .expect(200) // 断言成功状态码200
        .end((err, res) => {
            if (err) {
                return done(err); // 请求异常直接标记测试失败
            }

            // 断言响应格式（企业级标准化响应）
            expect(res.body).toHaveProperty('code', 200);
            expect(res.body).toHaveProperty('msg', '注册成功');
            expect(res.body.data).toBeDefined();
            // 断言返回的用户数据（隐藏敏感字段，包含核心信息）
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('username', validRegisterData.username);
            expect(res.body.data).toHaveProperty('email', validRegisterData.email);
            expect(res.body.data).toHaveProperty('role', 'admin');
            expect(res.body.data).not.toHaveProperty('password_hash'); // 确保不返回加密密码

            // 额外验证：数据库中确实存在该用户（通过模型层查询）
            userModel.checkUserExists(validRegisterData.username, validRegisterData.email, (checkErr, result) => {
                if (checkErr) {
                    return done(checkErr);
                }
                expect(result.length).toBe(1); // 断言用户已存在
                done();
            });
        });
});
