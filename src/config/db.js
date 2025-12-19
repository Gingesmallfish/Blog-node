require('dotenv').config();
const mysql = require('mysql2');

/**
 * 数据库连接
 * @type {Connection} 这里是一个对象
 */
const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

/**
 * 数据库连接
 */
conn.connect((err) => {
    if (err) {
        console.log('数据库连接失败', err);
    }
    console.log('数据库连接成功');
});

module.exports = conn;