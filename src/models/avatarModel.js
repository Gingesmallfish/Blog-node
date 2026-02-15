const conn = require("../config/db");

const avatarModel = {
  /**
   * 更新用户头像URL
   * @param {number} userId - 用户ID
   * @param {string} avatarUrl - 头像URL
   * @param {Function} callback - 回调函数 (err, result)
   */
  updateUserAvatar: (userId, avatarUrl, callback) => {
    const sql = "UPDATE users SET avatar = ? WHERE id = ?";

    conn.query(sql, [avatarUrl, userId], (dbErr, result) => {
      if (dbErr) {
        return callback(dbErr, null);
      }

      // 如果affectedRows为0，表示用户不存在
      if (result.affectedRows === 0) {
        const notFoundError = new Error(`用户不存在（ID：${userId}）`);
        notFoundError.code = "USER_NOT_FOUND";
        return callback(notFoundError, null);
      }

      callback(null, {
        affectedRows: result.affectedRows,
        avatarUrl: avatarUrl,
      });
    });
  },

  /**
   * 获取用户当前头像信息（可选）
   * @param {number} userId - 用户ID
   * @param {Function} callback - 回调函数 (err, result)
   */
  getUserAvatar: (userId, callback) => {
    const sql = "SELECT avatar FROM users WHERE id = ? LIMIT 1";

    conn.query(sql, [userId], (dbErr, result) => {
      if (dbErr) {
        return callback(dbErr, null);
      }

      if (result.length === 0) {
        const notFoundError = new Error(`用户不存在（ID：${userId}）`);
        notFoundError.code = "USER_NOT_FOUND";
        return callback(notFoundError, null);
      }

      callback(null, result[0].avatar);
    });
  },
};

module.exports = avatarModel;
