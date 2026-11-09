const path = require('path');

/**
 * 上传根目录：默认后端项目根下的 uploads，可用环境变量 UPLOAD_ROOT 覆盖。
 * 文件实体存磁盘，数据库只保存相对路径，便于后续切换到对象存储。
 */
const UPLOAD_ROOT = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.resolve(__dirname, '../../uploads');

/** 静态访问前缀，与 app.js 中 express.static 的挂载路径保持一致 */
const UPLOAD_URL_PREFIX = '/uploads';

/**
 * 各业务类型的扩展名白名单与大小上限。
 * 分开配置是因为头像与文档的合理大小、允许格式完全不同。
 * 头像刻意不允许 svg：svg 可内嵌脚本，直接静态访问存在 XSS 风险。
 */
const UPLOAD_RULES = {
  user_avatar: {
    exts: ['.jpg', '.jpeg', '.png', '.webp'],
    maxSize: 2 * 1024 * 1024
  },
  user_import: {
    exts: ['.xlsx', '.xls', '.pdf'],
    maxSize: 20 * 1024 * 1024
  }
};

/**
 * 将数据库中的相对路径还原为磁盘绝对路径。
 * 只接受以 UPLOAD_URL_PREFIX 开头的路径，防止通过 filePath 越权读取任意文件。
 * @param {string} filePath 数据库存储的相对路径，如 /uploads/user_avatar/2026/11/x.png
 * @returns {string|null} 磁盘绝对路径，非法路径返回 null
 */
function resolveUploadPath(filePath) {
  if (typeof filePath !== 'string' || !filePath.startsWith(`${UPLOAD_URL_PREFIX}/`)) {
    return null;
  }
  const relative = filePath.slice(UPLOAD_URL_PREFIX.length + 1);
  return path.join(UPLOAD_ROOT, relative);
}

module.exports = { UPLOAD_ROOT, UPLOAD_URL_PREFIX, UPLOAD_RULES, resolveUploadPath };
