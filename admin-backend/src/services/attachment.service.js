const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  UPLOAD_ROOT,
  UPLOAD_URL_PREFIX,
  resolveUploadPath
} = require('@/config/storage');
const {
  addAttachment,
  findAttachmentByFileId
} = require('@/repositories/attachment.repository');

/**
 * 删除磁盘上的文件，用于落库失败后的回滚，避免产生孤儿文件。
 * 删除本身失败只记录日志，不覆盖主流程的错误信息。
 * @param {string} absolutePath 文件的磁盘绝对路径
 */
function removeFileQuietly(absolutePath) {
  if (!absolutePath) {
    return;
  }
  fs.unlink(absolutePath, error => {
    if (error) {
      console.error('清理上传文件失败：', error.message);
    }
  });
}

/**
 * 保存上传文件的元数据。
 * 中间件已把文件写到磁盘，这里把 request.file.path 转成可访问的相对路径再落库。
 * @param {object} params 参数
 * @param {object} params.file multer 解析后的文件对象
 * @param {string} params.bizType 业务类型
 * @param {string|null} [params.uploader] 上传人
 * @returns {Promise<object>} 落库后的附件记录
 */
async function createAttachment({ file, bizType, uploader = null }) {
  // 用 path.relative 反推目录层级，避免在此重复计算年月目录
  const relativePath = path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/');
  const info = {
    fileId: uuidv4(),
    bizType,
    bizId: null,
    originalName: file.originalname,
    storedName: file.filename,
    // 库里只存相对路径，换域名或切 CDN 时无需改数据
    filePath: `${UPLOAD_URL_PREFIX}/${relativePath}`,
    ext: path.extname(file.filename).slice(1).toLowerCase(),
    mimeType: file.mimetype,
    size: file.size,
    storage: 'local',
    // 上传完成时尚未绑定具体业务，等业务提交后视为已绑定
    status: 0,
    uploader
  };

  try {
    return await addAttachment(info);
  } catch (error) {
    // 元数据没落库成功，磁盘文件就是垃圾，立即清理
    removeFileQuietly(file.path);
    throw error;
  }
}

/**
 * 按文件标识查询附件并计算磁盘路径。
 * @param {string} fileId 文件标识（UUID）
 * @returns {Promise<{ record: object, absolutePath: string } | null>} 查询结果，不存在返回 null
 */
async function getAttachmentFile(fileId) {
  const record = await findAttachmentByFileId(fileId);
  if (!record) {
    return null;
  }

  const absolutePath = resolveUploadPath(record.file_path);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return null;
  }

  return { record, absolutePath };
}

module.exports = { createAttachment, getAttachmentFile, removeFileQuietly };
