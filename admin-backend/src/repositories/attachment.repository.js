const database = require('@/config/database');

/**
 * 写入一条附件元数据。
 * 文件实体已由上传中间件写到磁盘，这里只落库，两者通过 file_path 关联。
 * @param {object} info 附件信息
 * @param {string} info.fileId 对外文件标识（UUID）
 * @param {string} info.bizType 业务类型
 * @param {string|null} info.bizId 关联业务主键，未绑定时为 null
 * @param {string} info.originalName 原始文件名
 * @param {string} info.storedName 磁盘文件名
 * @param {string} info.filePath 相对访问路径
 * @param {string} info.ext 扩展名（小写不带点）
 * @param {string} info.mimeType MIME 类型
 * @param {number} info.size 文件大小（字节）
 * @param {number} info.status 0 待绑定 / 1 已绑定
 * @param {string|null} info.uploader 上传人
 * @returns {Promise<object>} 落库后的附件记录
 */
async function addAttachment(info) {
  const sql = `
    INSERT INTO \`attachment\`
      (file_id, biz_type, biz_id, original_name, stored_name, file_path, ext, mime_type, size, storage, status, uploader)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    info.fileId,
    info.bizType,
    info.bizId,
    info.originalName,
    info.storedName,
    info.filePath,
    info.ext,
    info.mimeType,
    info.size,
    info.storage,
    info.status,
    info.uploader
  ];

  const [result] = await database.execute(sql, values);

  return { id: result.insertId, ...info };
}

/**
 * 按对外文件标识查询附件。
 * 下载与预览只暴露 fileId，避免用户枚举自增 id。
 * @param {string} fileId 文件标识（UUID）
 * @returns {Promise<object|null>} 附件记录，未找到返回 null
 */
async function findAttachmentByFileId(fileId) {
  const [rows] = await database.execute(
    `SELECT id, file_id, biz_type, biz_id, original_name, stored_name, file_path,
            ext, mime_type, size, storage, status, create_time
     FROM \`attachment\`
     WHERE file_id = ?`,
    [fileId]
  );

  return rows[0] || null;
}

module.exports = { addAttachment, findAttachmentByFileId };
