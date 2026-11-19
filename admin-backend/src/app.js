const express = require('express');
const authRoutes = require('@/routes/auth');
const userRoutes = require('@/routes/users');
const fileRoutes = require('@/routes/files');
const caseRoutes = require('@/routes/cases');
const enterpriseRoutes = require('@/routes/enterprise');
const { authenticate } = require('@/middlewares/auth.middleware');
const { UPLOAD_ROOT, UPLOAD_URL_PREFIX } = require('@/config/storage');

/**
 * 创建 Express 应用实例。
 * 将应用配置和监听端口分开，便于测试和复用。
 * @returns {import('express').Express} Express 应用实例
 */
function createApp() {
  const app = express();
  // 全局中间件，解析 JSON 请求体，挂载到 req.body 上
  app.use(express.json());

  app.get('/', function handleHomePage(request, response) {
    response.json({ message: 'Express 项目已成功运行' });
  });

  // 上传文件静态托管：数据库只存 /uploads/... 相对路径，这里映射到磁盘目录
  // 请求路径匹配UPLOAD_URL_PREFIX，如 /uploads/avatar/123.jpg，映射到 /uploads/avatar/123.jpg
  app.use(
    UPLOAD_URL_PREFIX,
    express.static(UPLOAD_ROOT, {
      maxAge: '7d',
      // 禁止浏览器按内容嗅探类型，降低上传文件被当作脚本执行的风险
      setHeaders(response) {
        response.setHeader('X-Content-Type-Options', 'nosniff');
      }
    })
  );

  // 登录/刷新/登出接口，自身内部处理鉴权，不能挂全局 token 校验
  app.use('/api/auth', authRoutes);
  // 用户相关接口（需登录）
  app.use('/api/users', authenticate, userRoutes);
  // 附件上传/下载接口（需登录）
  app.use('/api/files', authenticate, fileRoutes);
  // 办件及其阶段流程接口（需登录）
  app.use('/api/cases', authenticate, caseRoutes);
  // 企业相关接口（暂无需登录）
  app.use('/api/enterprise', enterpriseRoutes);
  return app;
}

module.exports = createApp();
