const { v4: uuidv4 } = require('uuid');
// 配置层现在导出多个连接池，这里只取默认库的连接池，保持后续 database.execute 调用不变
const { pool: database } = require('@/config/database');

/**
 * 转义 LIKE 模糊查询中的通配符（% _ \），
 * 防止用户输入 % 当作通配符导致查出全表。
 * @param {string} value 用户输入的查询关键字
 * @returns {string} 转义后的关键字
 */
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

/**
 * 从 test_db.sys_user 表查询全部用户，支持按用户名/真实姓名/手机号/邮箱模糊筛选。
 * sys_user 是表名，使用反引号避免与数据库关键字产生歧义。
 * 多个条件同时传时为 AND 关系；全部不传时查全部。
 * @param {object} filters 查询条件 { username, realName, phone, email }
 * @returns {Promise<Array>} 用户列表
 */
async function findAllUsers(filters = {}) {
  // 按需拼接 WHERE 条件
  const conditions = [];
  const values = [];

  if (filters.username) {
    conditions.push('username LIKE ?');
    values.push(`%${escapeLike(filters.username)}%`);
  }
  if (filters.realName) {
    conditions.push('real_name LIKE ?');
    values.push(`%${escapeLike(filters.realName)}%`);
  }
  if (filters.phone) {
    conditions.push('phone LIKE ?');
    values.push(`%${escapeLike(filters.phone)}%`);
  }
  if (filters.email) {
    conditions.push('email LIKE ?');
    values.push(`%${escapeLike(filters.email)}%`);
  }

  let sql = `
    SELECT id, userid, username, real_name AS realName, phone, email, avatar, gender, status, create_time, update_time
    FROM \`sys_user\`
  `;

  // 有条件时拼入 WHERE，值全部走占位符，保持预编译防 SQL 注入
  if (conditions.length > 0) {
    sql += `WHERE ${conditions.join(' AND ')} `;
  }
  sql += 'ORDER BY id ASC';

  const [rows] = await database.execute(sql, values);
  return rows;
}

/**
 * 将用户写入 test_db.sys_user 表。
 * userid 由服务端生成（UUID v4，全局唯一），不依赖前端传值。
 * create_time 和 update_time 使用数据库默认的当前时间。
 * @param {object} userInfo 用户信息
 * @returns {Promise<object>} 创建后的用户（含 userid）
 */
async function addUser(userInfo) {
  // 服务端生成 userid 唯一标识，避免信任客户端数据
  const userId = uuidv4();
  const sql = `
    INSERT INTO \`sys_user\` (userid, username, real_name, phone, email, avatar, gender, status, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    userId,
    userInfo.username,
    userInfo.realName,
    userInfo.phone,
    userInfo.email,
    userInfo.avatar,
    userInfo.gender,
    userInfo.status,
    // 未设置密码时存 null，该账号暂时无法登录
    userInfo.passwordHash || null
  ];
  const [result] = await database.execute(sql, values);
  console.log(result);
  return {
    id: result.insertId,
    userid: userId,
    username: userInfo.username,
    realName: userInfo.realName,
    phone: userInfo.phone,
    email: userInfo.email,
    avatar: userInfo.avatar,
    gender: userInfo.gender,
    status: userInfo.status,
    create_time: result.insertTime,
    update_time: result.updateTime
  };
}

/**
 * 根据 ID 查询单个用户。
 * 带参数的查询使用 execute 走预编译，防 SQL 注入。
 * @param {number} userId 用户 ID
 * @returns {Promise<object|null>} 用户信息，未找到时返回 null（上层转 404）
 */
async function findUserById(userId) {
  console.log(userId);
  const sql = `
    SELECT id, userid, username, real_name AS realName, phone, email, avatar, gender, status, create_time, update_time
    FROM \`sys_user\`
    WHERE userid = ?
  `;

  const [rows] = await database.execute(sql, [userId]);
  return rows[0] || null;
}

/**
 * 根据 ID 全量更新用户信息。
 * update_time 显式赋值 NOW()，不依赖表结构的自动更新属性。
 * 密码按需更新：passwordHash 为空表示本次不修改密码，避免编辑其他字段时误清空密码。
 * @param {number} userId 用户 ID
 * @param {object} userInfo 更新后的用户信息
 * @returns {Promise<object|null>} 更新成功的用户 ID，用户不存在时返回 null（上层转 404）
 */
async function updateUserById(userId, userInfo) {
  const sql = `
    UPDATE \`sys_user\`
    SET username = ?, real_name = ?, phone = ?, email = ?, avatar = ?, gender = ?, status = ?, update_time = NOW()
      ${userInfo.passwordHash ? ', password_hash = ?' : ''}
    WHERE userid = ?
  `;
  const values = [
    userInfo.username,
    userInfo.realName,
    userInfo.phone,
    userInfo.email,
    userInfo.avatar,
    userInfo.gender,
    userInfo.status
  ];
  if (userInfo.passwordHash) {
    values.push(userInfo.passwordHash);
  }
  values.push(userId);

  const [result] = await database.execute(sql, values);

  if (result.affectedRows === 0) {
    return null;
  }

  return { userid: userId };
}

/**
 * 根据 ID 删除用户。
 * @param {number} userid 用户 ID
 * @returns {Promise<object|null>} 被删除的用户 ID
 */
async function removeUserById(userid) {
  const [result] = await database.execute(
    'DELETE FROM `sys_user` WHERE userid = ?',
    [userid]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return { userid };
}

module.exports = {
  escapeLike,
  findAllUsers,
  findUserById,
  addUser,
  updateUserById,
  removeUserById
};
