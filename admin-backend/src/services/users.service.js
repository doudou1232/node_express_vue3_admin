const {
  findAllUsers,
  findUserById,
  addUser,
  updateUserById,
  removeUserById
} = require('@/repositories/user.repository');
const { hashPassword } = require('@/utils/password');

/**
 * 用户名格式：字母开头，只允许字母和数字。
 * 用户名用于登录，必须是纯英文（可带数字），中文只能放在 realName 里展示。
 */
const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;

/**
 * 密码最小长度，与前端表单校验保持一致。
 */
const PASSWORD_MIN_LENGTH = 6;

/**
 * 校验用户名是否符合登录名规范。
 * @param {string} username 待校验用户名
 * @returns {boolean} 是否合法
 */
function isValidUsername(username) {
  return USERNAME_PATTERN.test(String(username || ''));
}

/**
 * 校验密码长度是否达标（调用方负责判断是否需要校验空密码）。
 * @param {string} password 明文密码
 * @returns {boolean} 是否合法
 */
function isValidPassword(password) {
  return String(password || '').length >= PASSWORD_MIN_LENGTH;
}

/**
 * 查询用户列表接口（POST /api/users），支持按用户名/手机号/邮箱模糊筛选。
 * @param {object} filters 查询条件 { username, phone, email }，为空对象时查全部
 * @returns {Promise<Array>} 用户列表
 */
function getUsers(filters = {}) {
  return findAllUsers(filters);
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
 * 密码在这里转成哈希，明文不落库；未传密码时账号存 null，暂时无法登录。
 * @param {object} userInfo 用户信息，包含 username、realName、password、phone、email、gender、status
 * @param {string} userInfo.username 登录用户名（纯英文可带数字）
 * @param {string} userInfo.realName 真实姓名，用于界面展示
 * @param {string} [userInfo.password] 明文密码，可选
 * @param {string} userInfo.phone 手机号
 * @param {string} userInfo.email 邮箱
 * @param {string} userInfo.gender 性别
 * @param {number} userInfo.status 状态
 * @returns {Promise<object>} 创建后的用户（含自增 ID）
 */
function createUser(userInfo) {
  return addUser({
    ...userInfo,
    passwordHash: userInfo.password ? hashPassword(userInfo.password) : null
  });
}

/**
 * 更新用户接口（PUT /api/users/update/:id）。
 * 密码为空表示保持原密码不变，非空才重新哈希覆盖。
 * @param {number} userId 用户 ID
 * @param {object} userInfo 更新后的用户信息，password 为空则不改密码
 * @returns {Promise<object|null>} 更新成功的用户 ID，用户不存在时返回 null（上层转 404）
 */
function updateUser(userId, userInfo) {
  return updateUserById(userId, {
    ...userInfo,
    passwordHash: userInfo.password ? hashPassword(userInfo.password) : null
  });
}

/**
 * 删除用户接口（POST /api/users/delete）。
 * @param {number} userid 用户 ID
 * @returns {Promise<object|null>} 被删除的用户 ID，用户不存在时返回 null（上层转 404）
 */
function removeUser(userid) {
  return removeUserById(userid);
}

module.exports = {
  isValidUsername,
  isValidPassword,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  removeUser
};
