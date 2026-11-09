const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_ROOT, UPLOAD_RULES } = require('@/config/storage');

/** 上传文件字段名，前后端约定统一使用 file */
const UPLOAD_FIELD_NAME = 'file';

/** multer 与自定义校验错误的提示文案 */
const UPLOAD_ERROR_MESSAGES = {
  UNSUPPORTED_FILE_TYPE: '不支持的文件类型',
  LIMIT_FILE_SIZE: '文件超出大小限制',
  LIMIT_FILE_COUNT: '一次只能上传一个文件'
};

/**
 * 生成业务目录的相对片段：bizType/YYYY/MM。
 * 按年月分目录，避免同一目录堆积过多文件影响文件系统性能。
 * @param {string} bizType 业务类型，如 user_avatar
 * @returns {string} 相对目录片段
 */
function buildRelativeDir(bizType) {
  return `${bizType}/${moment().format('YYYY')}/${moment().format('MM')}`;
}

/**
 * 磁盘存储策略：目录按业务类型与年月分层，文件名一律 UUID + 原扩展名。
 * 不用原始文件名落盘，避免重名覆盖、中文编码问题与 ../ 路径穿越。
 */
const storage = multer.diskStorage({
  destination(request, file, callback) {
    const dir = path.join(UPLOAD_ROOT, buildRelativeDir(request.params.bizType));
    fs.mkdirSync(dir, { recursive: true });
    callback(null, dir);
  },
  filename(request, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${uuidv4()}${ext}`);
  }
});

/**
 * 按业务类型创建单文件上传中间件；未配置规则时返回 null，由调用方拒绝。
 * @param {string} bizType 业务类型，如 user_avatar
 * @returns {import('express').RequestHandler | null} multer 中间件
 */
function createUploader(bizType) {
  const rule = UPLOAD_RULES[bizType];
  if (!rule) {
    return null;
  }

  return multer({
    storage,
    // files: 1 限制单次只传一个文件，配合接口语义
    limits: { fileSize: rule.maxSize, files: 1 },
    fileFilter(request, file, callback) {
      const ext = path.extname(file.originalname).toLowerCase();
      // 扩展名白名单是第一道关；mimetype 由浏览器声明，不可单独作为依据
      if (!rule.exts.includes(ext)) {
        const error = new Error('UNSUPPORTED_FILE_TYPE');
        error.code = 'UNSUPPORTED_FILE_TYPE';
        return callback(error);
      }
      return callback(null, true);
    }
  }).single(UPLOAD_FIELD_NAME);
}

/**
 * 上传中间件入口：从路由参数取业务类型，解析 multipart 表单。
 * 把 multer 的错误在这里统一转成项目约定的响应格式（HTTP 200 + body.code）。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 * @param {import('express').NextFunction} next 下一个中间件
 */
function uploadSingleFile(request, response, next) {
  const uploader = createUploader(request.params.bizType);
  if (!uploader) {
    return response.json({ code: 400, message: '不支持的业务类型', data: null });
  }

  return uploader(request, response, error => {
    if (!error) {
      return next();
    }
    console.error('文件上传失败：', error.message);
    return response.json({
      code: 400,
      message: UPLOAD_ERROR_MESSAGES[error.code] || '文件上传失败',
      data: null
    });
  });
}

module.exports = { uploadSingleFile, buildRelativeDir, UPLOAD_FIELD_NAME };
