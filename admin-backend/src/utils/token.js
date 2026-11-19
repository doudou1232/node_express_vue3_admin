/**
 * 轻量 token 工具。
 * 采用 HMAC-SHA256 签名的自包含 token（结构类似 JWT，但不引入第三方依赖）：
 *   base64url(payload) + "." + base64url(signature)
 * 校验时无需查库、重启服务也不会导致已签发 token 失效。
 */
const crypto = require('crypto');

/** token 默认有效期（天），可通过环境变量覆盖 */
const TOKEN_EXPIRES_IN_DAYS = Number(process.env.TOKEN_EXPIRES_IN_DAYS || 7);

/** 签名密钥，生产环境必须通过环境变量注入，否则沿用本地默认值 */
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'node-express-vue3-admin-token-secret';

/** token 类型，防止 refreshToken 被直接当作 accessToken 使用 */
const TOKEN_TYPE = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh'
});
/** 一天的毫秒数 */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 计算 HMAC 签名。
 * @param {string} encodedPayload base64url 编码后的 payload
 * @returns {string} base64url 编码的签名
 */
function sign(encodedPayload) {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');
}

/**
 * 签发 token。
 * @param {object} profile 用户画像（userid、username、roles 等）
 * @param {string} type token 类型
 * @param {number} expiresAt 过期时间戳（毫秒）
 * @returns {string} token 字符串
 */
function signToken(profile, type, expiresAt) {
  const encodedPayload = Buffer.from(
    JSON.stringify({ ...profile, type, exp: expiresAt }),
    'utf8'
  ).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

/**
 * 校验并解析 token。
 * @param {string} token token 字符串
 * @param {string} type 期望的 token 类型
 * @returns {object|null} 解析后的 payload，无效或过期返回 null
 */
function verifyToken(token, type) {
  if (!token || typeof token !== 'string') return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  // 长度不等时 timingSafeEqual 会直接抛错，先做长度判断
  if (expected.length !== signature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.type !== type) return null;
  if (!payload.exp || payload.exp <= Date.now()) return null;

  return payload;
}

/**
 * 生成 accessToken 与 refreshToken。
 * accessToken 的过期时间不会晚于 refreshToken，避免靠反复刷新无限续期。
 * @param {object} profile 用户画像
 * @param {number} [refreshExpiresAt] 沿用旧的 refreshToken 过期时间（刷新场景）
 * @returns {object} { accessToken, refreshToken, expires, refreshExpires }
 */
function createTokenPair(profile, refreshExpiresAt) {
  const now = Date.now();
  const refreshExpires = refreshExpiresAt || now + TOKEN_EXPIRES_IN_DAYS * ONE_DAY_MS;
  const accessExpires = Math.min(now + TOKEN_EXPIRES_IN_DAYS * ONE_DAY_MS, refreshExpires);

  return {
    accessToken: signToken(profile, TOKEN_TYPE.ACCESS, accessExpires),
    refreshToken: signToken(profile, TOKEN_TYPE.REFRESH, refreshExpires),
    // 前端用 ISO 字符串即可被 new Date() 直接解析
    expires: new Date(accessExpires).toISOString(),
    refreshExpires
  };
}

module.exports = {
  TOKEN_TYPE,
  TOKEN_EXPIRES_IN_DAYS,
  createTokenPair,
  verifyToken
};
