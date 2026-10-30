const {
  findAllUsers,
  findUserById,
  addUser,
  updateUserById,
  removeUserById
} = require('@/repositories/user.repository');

/**
 * 查询全部用户接口（GET /api/users）。
 * @returns {Promise<Array>} 用户列表
 */
function getUsers() {
  return findAllUsers();
}

/**
 * 按 ID 查询用户接口（GET /api/users/:id）。
 * @param {number} userId 用户 ID
 * @returns {Promise<object|null>} 用户信息，未找到时返回 null（上层转 404）
 */
function getUserById(userId) {
  return findUserById(userId);
}

/**
 * 创建用户接口（POST /api/users/add）。
 * @param {object} userInfo 用户信息
 * @returns {Promise<object>} 创建后的用户（含自增 ID）
 */
function createUser(userInfo) {
  return addUser(userInfo);
}

/**
 * 更新用户接口（PUT /api/users/update/:id）。
 * @param {number} userId 用户 ID
 * @param {object} userInfo 更新后的用户信息
 * @returns {Promise<object|null>} 更新成功的用户 ID，用户不存在时返回 null（上层转 404）
 */
function updateUser(userId, userInfo) {
  return updateUserById(userId, userInfo);
}

/**
 * 删除用户接口（DELETE /api/users/delete/:id）。
 * @param {number} userId 用户 ID
 * @returns {Promise<object|null>} 被删除的用户 ID，用户不存在时返回 null（上层转 404）
 */
function removeUser(userId) {
  return removeUserById(userId);
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  removeUser
};
