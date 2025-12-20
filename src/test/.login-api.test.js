const request = require('supertest');
const app = require('../index');
const conn = require('../config/db');

// 测试场景1：登录成功
test('POST /api/login 合法参数应返回200和用户信息', (done) => {
    const loginData = {
        usernameOrEmail: 'test', // 已注册的用户名或邮箱
        password: '123456jly@'
    };

    request(app)
        .post('/api/login')
        .send(loginData)
        .expect(200)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body.code).toBe(200);
            expect(res.body.data).toHaveProperty('username', 'test');
            expect(res.body.data).toHaveProperty('role');
            done();
        });
});
