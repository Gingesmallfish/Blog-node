// 注册接口专属测试文件：覆盖分层架构下的所有核心场景
const request = require('supertest');
const app = require('../index'); // 导入分层后的 Express app 实例
const conn = require('../config/db'); // 数据库连接
const userModel = require('../models/userModel'); // 可用于模拟模型层（可选）

// 测试前置操作：1. 清空测试用户数据 2. 确保数据库连接正常
// beforeAll((done) => {
//     // 清空用户名以 test_ 开头的测试数据，避免重复注册冲突
//     const truncateSql = 'DELETE FROM users WHERE username LIKE ?';
//     conn.query(truncateSql, ['test_%'], (err) => {
//         if (err) {
//             console.error('前置操作：清空测试用户数据失败:', err);
//             done(err);
//             return;
//         }
//         console.log('前置操作：测试用户数据已清空');
//         done();
//     });
// });

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
        username: 'demo02', // 符合用户名格式
        email: 'demo02@example.com', // 合法邮箱
        password: 'Test123456' // 符合密码强度（字母+数字，6-20位）
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
            expect(res.body.data).toHaveProperty('role', 'user');
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

// -------------- 测试场景2：参数缺失 - 用户名为空 --------------
test('POST /api/register 用户名为空应返回400状态码和错误提示', (done) => {
    const invalidData = {
        username: '', // 用户名缺失
        email: 'test_empty_username@example.com',
        password: 'Test123456'
    };

    request(app)
        .post('/api/register')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400) // 断言参数错误状态码400
        .end((err, res) => {
            if (err) {
                return done(err);
            }

            // 断言响应错误信息
            expect(res.body).toHaveProperty('code', 400);
            expect(res.body.msg).toContain('用户名不能为空');
            expect(res.body.data).toBeNull();
            done();
        });
});

// -------------- 测试场景3：格式非法 - 用户名含特殊字符 --------------
test('POST /api/register 用户名含特殊字符应返回400状态码和错误提示', (done) => {
    const invalidData = {
        username: 'test@user', // 包含@特殊字符，不符合格式
        email: 'test_invalid_username@example.com',
        password: 'Test123456'
    };

    request(app)
        .post('/api/register')
        .send(invalidData)
        .set('Content-Type', 'application/json')
        .expect(400)
        .end((err, res) => {
            if (err) {
                return done(err);
            }

            expect(res.body).toHaveProperty('code', 400);
            expect(res.body.msg).toContain('用户名需为3-20位字母、数字或下划线');
            expect(res.body.data).toBeNull();
            done();
        });
});

// -------------- 测试场景4：重复注册 - 用户名已存在 --------------
test('POST /api/register 用户名已被占用应返回400状态码和错误提示', (done) => {
    // 第一步：先注册一个合法用户（确保用户名存在）
    const baseUser = {
        username: 'test_duplicate_user',
        email: 'test_duplicate1@example.com',
        password: 'Test123456'
    };

    request(app)
        .post('/api/register')
        .send(baseUser)
        .set('Content-Type', 'application/json')
        .end((err1) => {
            if (err1) {
                return done(err1);
            }

            // 第二步：使用相同用户名、不同邮箱再次注册（触发重复校验）
            const duplicateUser = {
                username: baseUser.username, // 重复用户名
                email: 'test_duplicate2@example.com',
                password: 'Test123456'
            };

            request(app)
                .post('/api/register')
                .send(duplicateUser)
                .set('Content-Type', 'application/json')
                .expect(400)
                .end((err2, res) => {
                    if (err2) {
                        return done(err2);
                    }

                    expect(res.body).toHaveProperty('code', 400);
                    expect(res.body.msg).toBe('用户名已被占用');
                    expect(res.body.data).toBeNull();
                    done();
                });
        });
});

// -------------- 测试场景5：服务器异常 - 捕获异常处理（可选，模拟模型层错误） --------------
test('POST /api/register 服务器内部错误应返回500状态码和统一提示', (done) => {
    // 模拟模型层查询失败（替换原有方法，制造异常）
    const originalCheckUserExists = userModel.checkUserExists;
    userModel.checkUserExists = (username, email, callback) => {
        callback(new Error('模拟数据库查询异常'), null);
    };

    const validData = {
        username: 'test_error_user',
        email: 'test_error_user@example.com',
        password: 'Test123456'
    };

    request(app)
        .post('/api/register')
        .send(validData)
        .set('Content-Type', 'application/json')
        .expect(500) // 断言异常状态码500
        .end((err, res) => {
            if (err) {
                return done(err);
            }

            // 断言全局异常处理中间件的统一响应
            expect(res.body).toHaveProperty('code', 500);
            expect(res.body.msg).toBe('服务器内部错误，请稍后重试');
            expect(res.body.data).toBeNull();

            // 还原模型层原有方法，避免影响其他测试
            userModel.checkUserExists = originalCheckUserExists;
            done();
        });
});