# Express 项目说明与开发规则

## Codex 规则目录

详细规则位于仓库根目录 `../.codex/rules/`（前后端共享），开始处理本项目任务时，按以下优先级读取：

1. `../.codex/rules/project-overview.md`：始终读取，了解全栈架构、前后端连接关系、技术栈。
2. `../.codex/rules/directory-structure.md`：始终读取，了解目录约束与文件存放规范。
3. `../.codex/rules/coding-standards.md`：始终读取，了解代码编写规范（命名、注释、分层、安全等）。
4. `../.codex/rules/config-reference.md`：修改配置前读取，了解 `.env`、`vite.config.ts`、`tsconfig.json` 等配置文件。
5. `../.codex/rules/api-development-guide.md`：编写后端接口时读取，了解接口开发顺序、各层可用 API（database.execute/query、Express Request/Response/Router）及使用场景。

## 项目目标

这是一个使用 Express 和原生 JavaScript 编写的学习型 API 项目。项目保持 CommonJS 模块规范，使用 `@/` 作为 `src/` 目录的模块别名。

## 目录功能

```text
index.js                 # 项目入口，注册别名并启动服务
src/
├─ app.js                # 创建 Express 应用、注册中间件和路由
├─ server.js             # 读取端口并启动 HTTP 服务
├─ routes/               # 路由定义，只负责 URL 和控制器的对应关系
├─ controllers/          # 接收请求参数并返回 HTTP 响应
├─ services/             # 编写可复用的业务逻辑
├─ repositories/          # 编写数据库查询和持久化逻辑
├─ config/                # 数据库等基础设施配置
├─ utils/                # 通用工具方法
└─ greet.js              # 问候示例模块
```

## 请求处理流程

```text
请求 → routes → controllers → services → utils 或数据访问层 → 响应
```

当前示例接口：

- `GET /`：检查服务是否启动。
- `GET /api/greet?name=小明`：返回问候语。
- `POST /api/users/add`：创建用户。
- `DELETE /api/users/delete/:id`：删除用户。
- `GET /api/users`：从 `test_db.user` 表查询全部用户。

## 开发命令

以下命令均在 `admin-backend/` 目录下执行：

- `npm start`：启动服务。
- `npm run dev`：使用 Node.js watch 模式启动，修改文件后自动重启。

## 开发约定

- 使用 CommonJS（`require` / `module.exports`）。
- `index.js` 只负责启动，不放业务逻辑。
- 路由保持简洁，业务逻辑放在 `services/`。
- 新增功能时优先复用现有模块，不为单一用途增加复杂抽象。
- 新增代码应提供易读的中文注释，并通过 `npm start` 或接口请求验证。
