require('dotenv').config();
const mysql = require('mysql2');

/**
 * 数据库连接
 * @type {Connection} 这里是一个对象
 */
const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

/**
 * 数据库连接
 */
conn.connect((err) => {
    if (err) {
        console.log('数据库连接失败', err);
        return; // 连接失败终止后续
    }
    console.log('✅ 数据库连接成功');
});

/**
 * ✅ 核心封装：通用SQL查询方法（纯回调、无Promise、无try-catch）
 * @param {string} sql 执行的SQL语句
 * @param {Array} params SQL占位符参数数组
 * @param {Function} callback 回调函数 (err, results) => {}
 */
const query = (sql, params, callback) => {
    // 容错1：如果不传params参数，兼容 (sql, callback) 写法
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    // 执行SQL查询（mysql2原生回调）
    conn.query(sql, params, (err, results) => {
        // 错误优先：回调函数第一个参数永远是错误信息
        if (err) {
            console.error('❌ SQL执行失败：', err);
            return callback(err, null);
        }
        // 执行成功：错误为null，第二个参数返回查询结果
        callback(null, results);
    });
};

// 导出【连接对象conn + 封装好的query方法】，满足项目全局使用
module.exports = { conn, query };