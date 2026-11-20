/**
 * 密码哈希工具。
 *
 * 选型说明：
 *   使用 Node 内置 crypto 的 scrypt，而不是 bcrypt / argon2，
 *   原因是后两者需要引入带原生编译的第三方依赖，本项目依赖策略是能不编译就不编译。
 *   scrypt 是内存困难型 KDF（密钥派生函数），默认参数下单次计算约需 16MB 内存，
 *   对 GPU / 并行爆破天然不友好，作为本项目的登录密码方案足够。
 *
 * 存储格式：
 *   `salt:hash`，两者均为 hex 字符串。
 *   salt 是 16 字节随机数 → 32 个 hex 字符；
 *   hash 是 64 字节派生值（KEY_LENGTH）→ 128 个 hex 字符；
 *   加上中间的冒号，数据库 password_hash 的实际长度固定为 161。
 *
 * 重要性质：
 *   scrypt 是单向函数，哈希不可逆，明文密码在任何地方都不会被保存或还原。
 *   所以「导出账号密码」这类需求只能通过重置实现，无法从库里算回去。
 *   校验密码的唯一方式：用输入的明文 + 库里的盐重新算一遍，逐字节比对。
 *
 * 使用示例：
 *   // 写入：创建 / 重置密码时调用，明文不落库
 *   const stored = hashPassword('Case@2026');            // "3f2a…:9c1b…"
 *   await updateUserPassword(userid, stored);
 *   // 校验：登录时调用，匹配返回 true
 *   const ok = verifyPassword('Case@2026', stored);
 */
const crypto = require('crypto');

/**
 * scrypt 输出长度（字节），校验时必须与签发时一致。
 * 64 字节 = 128 位 hex 字符，对密码场景强度绰绰有余；
 * 派生值过短会降低碰撞成本，过长只会白白增加存储与计算量。
 */
const KEY_LENGTH = 64;

/**
 * 生成密码哈希。
 *
 * 流程：
 *   1. crypto.randomBytes 生成 16 字节密码学安全随机盐；
 *      每次调用都生成新盐，因此同一个密码两次哈希的结果不同，
 *      这也是库里看不到相同哈希、彩虹表攻击失效的原因。
 *   2. scryptSync 以「盐 + 明文」派生 64 字节密钥。
 *      未显式传 N / r / p 时使用 Node 默认值（N=16384, r=8, p=1，约 16MB 内存），
 *      签发与校验两端都走默认值，参数天然一致。
 *
 * 注意：scryptSync 是同步阻塞调用，单次几十毫秒量级。
 * 登录、建号、重置密码都是低频操作，阻塞可接受；
 * 若未来出现高频调用场景，应换成 crypto.scrypt 异步版本，避免卡住事件循环。
 *
 * @param {string} plain 明文密码
 * @returns {string} `salt:hash` 形式的哈希串，直接写入 sys_user.password_hash
 */
function hashPassword(plain) {
  // 每个用户、每次重置都生成独立盐：相同明文得到不同哈希，防止批量撞库
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 校验明文密码与哈希是否匹配。
 *
 * 流程：
 *   1. 把库存的 `salt:hash` 拆开，取出签发时的盐；
 *   2. 用同样的盐 + 待校验明文重新派生一遍；
 *   3. 与库中哈希做常数时间比对。
 *
 * 实现细节：
 *   - 使用 timingSafeEqual 而不是 `===`：逐字节常数时间比较，
 *     不让「前几位对了就更快返回」的时序差异暴露给攻击者；
 *   - 任何异常情况（空密码、格式不对）都返回 false 而不是抛错，
 *     登录接口据此统一提示「账号或密码错误」，不区分具体失败原因，避免用户枚举。
 *
 * @param {string} plain 待校验的明文密码
 * @param {string|null} stored 数据库中的 `salt:hash`
 * @returns {boolean} 是否匹配
 */
function verifyPassword(plain, stored) {
  // 空密码，或库里没有哈希（建号时未设密码）都直接判失败
  if (!plain || !stored) return false;

  const [salt, hash] = String(stored).split(':');
  // 格式不完整同样视为不匹配，不抛错
  if (!salt || !hash) return false;

  // 用库里的盐重新派生，参数必须与 hashPassword 完全一致
  const input = crypto.scryptSync(String(plain), salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(hash, 'hex');
  // 长度不等时 timingSafeEqual 会直接抛错，先做长度判断
  if (input.length !== storedBuffer.length) return false;

  // 常数时间比对，防止时序攻击逐字节猜密码
  return crypto.timingSafeEqual(input, storedBuffer);
}

module.exports = { hashPassword, verifyPassword };
