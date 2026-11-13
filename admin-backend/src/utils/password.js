/**
 * 密码哈希工具。
 * 使用 Node 内置 scrypt，避免引入 bcrypt 等需要编译的原生依赖。
 * 存储格式为 `salt:hash`（均为 hex），salt 每个用户独立。
 */
const crypto = require('crypto');

/** scrypt 输出长度（字节），校验时必须与签发时一致 */
const KEY_LENGTH = 64;

/**
 * 生成密码哈希。
 * @param {string} plain 明文密码
 * @returns {string} `salt:hash` 形式的哈希串
 */
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 校验明文密码与哈希是否匹配。
 * @param {string} plain 明文密码
 * @param {string|null} stored 数据库中的 `salt:hash`
 * @returns {boolean} 是否匹配
 */
function verifyPassword(plain, stored) {
  if (!plain || !stored) return false;

  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;

  const input = crypto.scryptSync(String(plain), salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(hash, 'hex');
  // 长度不等时 timingSafeEqual 会直接抛错，先做长度判断
  if (input.length !== storedBuffer.length) return false;

  return crypto.timingSafeEqual(input, storedBuffer);
}

module.exports = { hashPassword, verifyPassword };
