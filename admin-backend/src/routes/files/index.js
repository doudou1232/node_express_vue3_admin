const express = require('express');
const { uploadSingleFile } = require('@/middlewares/upload.middleware');
const { uploadFile, downloadFile } = require('@/controllers/attachment.controller');

const router = express.Router();

// POST /api/files/upload/:bizType —— multipart 上传，字段名 file
router.post('/upload/:bizType', uploadSingleFile, uploadFile);
// GET /api/files/:fileId/download —— 按文件标识下载，保留原始文件名
router.get('/:fileId/download', downloadFile);

module.exports = router;
