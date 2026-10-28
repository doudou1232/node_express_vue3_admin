const database = require('@/config/database');

/**
 * 从 test_db.sys_user 表查询全部用户。
 * sys_user 是表名，使用反引号避免与数据库关键字产生歧义。
 * @returns {Promise<Array>} 用户列表
 */
async function findAllUsers() {
  const sql = `
    SELECT id, username, phone, gender, status, create_time, update_time
    FROM \`sys_user\`
    ORDER BY id DESC
  `;

  const [rows] = await database.query(sql);
  return rows;
}

/**
 * 将用户写入 test_db.sys_user 表。
 * create_time 和 update_time 使用数据库默认的当前时间。
 * @param {object} userInfo 用户信息
 * @returns {Promise<object>} 创建后的用户
 */
async function addUser(userInfo) {
  const sql = `
    INSERT INTO \`sys_user\` (username, phone, gender, status)
    VALUES (?, ?, ?, ?)
  `;
  const values = [
    userInfo.username,
    userInfo.phone,
    userInfo.gender,
    userInfo.status
  ];
  const [result] = await database.execute(sql, values);

  return {
    id: result.insertId,
    username: userInfo.username,
    phone: userInfo.phone,
    gender: userInfo.gender,
    status: userInfo.status
  };
}

/**
 * 根据 ID 查询单个用户。
 * 带参数的查询使用 execute 走预编译，防 SQL 注入。
 * @param {number} userId 用户 ID
 * @returns {Promise<object|null>} 用户信息，未找到时返回 null（上层转 404）
 */
async function findUserById(userId) {
  const sql = `
    SELECT id, username, phone, gender, status, create_time, update_time
    FROM \`sys_user\`
    WHERE id = ?
  `;

  const [rows] = await database.execute(sql, [userId]);
  return rows[0] || null;
}

/**
 * 根据 ID 全量更新用户信息。
 * update_time 显式赋值 NOW()，不依赖表结构的自动更新属性。
 * @param {number} userId 用户 ID
 * @param {object} userInfo 更新后的用户信息
 * @returns {Promise<object|null>} 更新成功的用户 ID，用户不存在时返回 null（上层转 404）
 */
async function updateUserById(userId, userInfo) {
  const sql = `
    UPDATE \`sys_user\`
    SET username = ?, phone = ?, gender = ?, status = ?, update_time = NOW()
    WHERE id = ?
  `;
  const values = [
    userInfo.username,
    userInfo.phone,
    userInfo.gender,
    userInfo.status,
    userId
  ];
  const [result] = await database.execute(sql, values);

  if (result.affectedRows === 0) {
    return null;
  }

  return { id: userId };
}

/**
 * 根据 ID 删除用户。
 * @param {number} userId 用户 ID
 * @returns {Promise<object|null>} 被删除的用户 ID
 */
async function removeUserById(userId) {
  const [result] = await database.execute(
    'DELETE FROM `sys_user` WHERE id = ?',
    [userId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return { id: userId };
}

module.exports = {
  findAllUsers,
  findUserById,
  addUser,
  updateUserById,
  removeUserById
};
