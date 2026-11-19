// 配置层现在导出多个连接池，这里只取默认库的连接池，保持后续 database.execute 调用不变
const { pool: database } = require('@/config/database');

/**
 * 按用户名查询登录所需的凭证信息。
 * 只给登录校验使用，password_hash 绝不能出现在其他查询的返回里。
 * @param {string} username 用户名
 * @returns {Promise<object|null>} 含 password_hash 的用户记录，未找到返回 null
 */
async function findUserByUsernameWithSecret(username) {
  const [rows] = await database.execute(
    `SELECT id, userid, username, real_name AS realName, avatar, status, password_hash, roles, permissions
     FROM \`sys_user\`
     WHERE username = ?
     LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

/**
 * 按 userid 查询登录态所需的用户信息。
 * 用于 token 校验后补充最新的角色与权限，避免改权限后必须重新登录。
 * @param {string} userid 用户唯一标识
 * @returns {Promise<object|null>} 用户记录，未找到返回 null
 */
async function findUserProfileById(userid) {
  const [rows] = await database.execute(
    `SELECT userid, username, real_name AS realName, avatar, status, roles, permissions
     FROM \`sys_user\`
     WHERE userid = ?
     LIMIT 1`,
    [userid]
  );
  return rows[0] || null;
}

module.exports = { findUserByUsernameWithSecret, findUserProfileById };
