const { findAllUsers, findUserById } = require('@/repositories/user.repository');

/**
 * 查询用户业务入口。
 * @returns {Promise<Array>} 用户列表
 */
function getUsers() {
  return findAllUsers();
}

/**
 * 按 ID 查询用户业务入口。
 * @param {number} userId 用户 ID
 * @returns {Promise<object|null>} 用户信息
 */
function getUserById(userId) {
  return findUserById(userId);
}

module.exports = {
  findAllUsers: getUsers,
  findUserById: getUserById
};
