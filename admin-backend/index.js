// 加载环境变量，必须在加载数据库模块前执行。
require('dotenv').config();

// 注册 @/ 路径别名，必须在加载业务模块前执行。
require('module-alias/register');

// 项目入口：只负责加载服务启动文件。
require('@/server');
