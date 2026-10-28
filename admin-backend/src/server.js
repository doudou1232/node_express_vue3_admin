const app = require('@/app');

const port = Number(process.env.PORT) || 3000;

app.listen(port, function handleServerStarted() {
  console.log(`服务已启动：http://localhost:${port}`);
});
