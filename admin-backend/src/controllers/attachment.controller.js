const fs = require('fs');
const { createAttachment, getAttachmentFile } = require('@/services/attachment.service');

// 默认上传人：当前未接入登录态，前端未传时兜底为庄瑜，接入鉴权后改为取登录用户
const DEFAULT_UPLOADER = '庄瑜';

/**
 * 上传单个文件（POST /api/files/upload/:bizType）。
 * 中间件已完成磁盘写入，这里只负责落库并返回可访问路径。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function uploadFile(request, response) {
  // 文件类型/大小不合规已在中间件拦截，这里兜底没收到文件的场景
  if (!request.file) {
    return response.json({ code: 400, message: '请选择要上传的文件', data: null });
  }

  try {
    const record = await createAttachment({
      file: request.file,
      bizType: request.params.bizType,
      // multipart 的文本字段由 multer 解析进 body，未传或空串时用默认上传人
      uploader: request.body?.uploader || DEFAULT_UPLOADER
    });

    return response.json({
      code: 200,
      message: '上传成功',
      data: {
        fileId: record.fileId,
        filePath: record.filePath,
        originalName: record.originalName,
        size: record.size,
        mimeType: record.mimeType
      }
    });
  } catch (error) {
    console.error('保存附件失败：', error.message);
    return response.json({ code: 500, message: '上传失败', data: null });
  }
}

/**
 * 下载/预览文件（GET /api/files/:fileId/download）。
 * 默认作为附件下载，浏览器可另存；预览时由前端按 mimeType 决定展示方式。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function downloadFile(request, response) {
  let result;
  try {
    result = await getAttachmentFile(request.params.fileId);
  } catch (error) {
    console.error('查询附件失败：', error.message);
    return response.json({ code: 500, message: '下载失败', data: null });
  }

  if (!result) {
    return response.json({ code: 404, message: '文件不存在', data: null });
  }

  const { record, absolutePath } = result;
  response.setHeader('Content-Type', record.mime_type);
  // 中文文件名必须走 filename*（RFC 5987），否则浏览器下载后名称乱码
  response.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(record.original_name)}`
  );

  const stream = fs.createReadStream(absolutePath);
  stream.on('error', error => {
    console.error('读取文件失败：', error.message);
    // 响应头已发送，只能中断连接，避免前端拿到半截文件当成功
    response.destroy(error);
  });
  stream.pipe(response);
}

module.exports = { uploadFile, downloadFile };
