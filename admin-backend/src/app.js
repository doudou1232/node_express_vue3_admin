const express = require('express');
const userRoutes = require('@/routes/users');
/**
 * 创建 Express 应用实例。
 * 将应用配置和监听端口分开，便于测试和复用。
 * @returns {import('express').Express} Express 应用实例
 */
function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/', function handleHomePage(request, response) {
    response.json({ message: 'Express 项目已成功运行' });
  });

  // 用户相关接口
  app.use('/api/users', userRoutes);

  return app;
}

module.exports = createApp();
