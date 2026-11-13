const {
  findUserByUsernameWithSecret,
  findUserProfileById
} = require('@/repositories/auth.repository');
const { verifyPassword } = require('@/utils/password');
const { TOKEN_TYPE, createTokenPair, verifyToken } = require('@/utils/token');

/** 用户停用状态值，停用账号不允许登录 */
const USER_STATUS_DISABLED = 0;

/**
 * 把库里的逗号分隔字符串转成数组。
 * roles/permissions 用字符串存是为了免建关联表，前端需要的是数组。
 * @param {string|null} value 逗号分隔字符串，如 "admin,common"
 * @returns {Array<string>} 去空后的数组
 */
function splitToList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * 组装返回给前端的用户画像。
 * 字段名与前端 UserResult.data 对齐（snake_case 只出现在数据库层）。
 * @param {object} user 数据库用户记录
 * @returns {object} 用户画像
 */
function buildProfile(user) {
  return {
    userid: user.userid,
    username: user.username,
    // 界面展示真实姓名，老数据没有姓名时回落为用户名
    nickname: user.realName || user.username,
    avatar: user.avatar || '',
    roles: splitToList(user.roles),
    permissions: splitToList(user.permissions)
  };
}

/**
 * 登录校验。
 * 用户名不存在与密码错误返回同一提示，避免被用来枚举用户。
 * @param {string} username 用户名
 * @param {string} password 明文密码
 * @returns {Promise<object|null>} 登录结果，凭证错误返回 null（上层转 400）
 */
async function login(username, password) {
  const user = await findUserByUsernameWithSecret(username);
  if (!user) return null;
  if (Number(user.status) === USER_STATUS_DISABLED) return null;
  if (!verifyPassword(password, user.password_hash)) return null;

  const profile = buildProfile(user);
  const tokens = createTokenPair(profile);

  return {
    ...profile,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expires: tokens.expires
  };
}

/**
 * 刷新 token。
 * 刷新后沿用原 refreshToken 的过期时间，不允许通过反复刷新无限延长登录态。
 * @param {string} refreshToken 前端携带的 refreshToken
 * @returns {Promise<object|null>} 新的 token 信息，refreshToken 无效返回 null
 */
async function refresh(refreshToken) {
  const payload = verifyToken(refreshToken, TOKEN_TYPE.REFRESH);
  if (!payload) return null;

  // 以库中最新数据为准，用户被停用或删除后刷新立即失败
  const user = await findUserProfileById(payload.userid);
  if (!user || Number(user.status) === USER_STATUS_DISABLED) return null;

  const profile = buildProfile(user);
  const tokens = createTokenPair(profile, payload.exp);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expires: tokens.expires
  };
}

/**
 * 校验 accessToken 并返回当前用户画像。
 * @param {string} accessToken 请求头中的 token
 * @returns {Promise<object|null>} 用户画像，token 无效或用户不可用返回 null
 */
async function getCurrentUser(accessToken) {
  const payload = verifyToken(accessToken, TOKEN_TYPE.ACCESS);
  if (!payload) return null;

  const user = await findUserProfileById(payload.userid);
  if (!user || Number(user.status) === USER_STATUS_DISABLED) return null;

  return buildProfile(user);
}

/**
 * 按 userid 查询用户画像，供接口补充当前登录人信息使用。
 * @param {string} userid 用户唯一标识
 * @returns {Promise<object|null>} 用户画像，未找到返回 null
 */
async function getProfileById(userid) {
  const user = await findUserProfileById(userid);
  return user ? buildProfile(user) : null;
}

module.exports = { login, refresh, getCurrentUser, getProfileById };
