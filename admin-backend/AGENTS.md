# Express 后端项目说明与开发规则

## 规则文件（开始任务前按序读取）

详细规则位于仓库根目录 `../.codex/rules/`（前后端共享）：

1. `../.codex/rules/project-overview.md`：始终读取——全栈架构、技术栈、认证与权限体系。
2. `../.codex/rules/directory-structure.md`：始终读取——目录约束与新增文件存放位置。
3. `../.codex/rules/coding-standards.md`：始终读取——命名、注释、分层、安全规范。
4. `../.codex/rules/api-development-guide.md`：编写接口时读取——各层可用 API 与开发顺序。
5. `../.codex/rules/config-reference.md`：修改配置前读取——`.env`、连接池、端口配置。

## 项目定位

管理后台的 API 服务。Express 5 + 原生 JavaScript（CommonJS），`@/` 别名指向 `src/`。前端项目在 `admin-frontend/`，开发时通过 Vite 将 `/api` 代理到本服务（端口 3000）。

## 架构总览

```text
请求 → app.js（express.json → /uploads 静态托管 → 挂载路由）
     → routes/<资源>/index.js（URL 映射 + 鉴权中间件）
     → controllers/*.controller.js（参数校验 + 调 service + 统一响应）
     → services/*.service.js（业务逻辑）
     → repositories/*.repository.js（SQL，参数化查询）
     → MySQL
```

- 认证：`middlewares/auth.middleware.js` 的 `authenticate` 校验 Bearer token（`utils/token.js` 自研 HMAC-SHA256 双 token，无第三方依赖），通过后挂 `request.user`。
- 权限：`requirePerms(PERMISSIONS.XXX)` 按权限码拦截；权限模型唯一可信来源是 `constants/permission.js`（角色 → 权限码映射，管理员 `*:*:*` 通配）。
- 响应：统一 `{ code, message, data }`；`code` 与 HTTP 状态码一致（200 成功，400/404/409/500 业务错误）；唯一特例是未登录/token 过期返回 HTTP 200 + `code: 401`，前端据此跳转登录页。

## 目录职责

```text
index.js                 # 入口：dotenv + module-alias 注册后启动 src/server.js
db/                      # SQL 脚本、初始化数据与运维工具（run-sql.js 等）
uploads/                 # 上传文件实体（数据库只存 /uploads/... 相对路径）
src/
├─ app.js                # Express 实例：中间件、静态托管、路由挂载（含 authenticate）
├─ server.js             # 读取 PORT 并监听
├─ config/               # database.js 连接池；storage.js 上传目录与类型白名单
├─ constants/            # permission.js 权限模型；case.js 业务常量
├─ middlewares/          # auth.middleware.js（authenticate / requirePerms）；upload.middleware.js
├─ routes/               # auth / users / files / cases / enterprise，仅 URL 映射
├─ controllers/          # 参数校验 + 调 service + 响应
├─ services/             # 业务逻辑（薄透传为主，复杂逻辑放这里）
├─ repositories/         # SQL 与持久化，禁止拼接字符串
└─ utils/                # token.js、password.js、utils.js（formatDate 等）
```

## 业务模块与接口

| 路由前缀 | 模块 | 说明 |
|---------|------|------|
| `/api/auth` | 登录认证 | login / refresh-token 免鉴权；profile / logout 需 token |
| `/api/users` | 人员管理 | CRUD + options 选项接口，requirePerms 控制 |
| `/api/files` | 附件 | `upload/:bizType`（multer 白名单校验）+ `/:fileId/download` |
| `/api/cases` | 办件管理 | CRUD + `/:caseguid/stage` 阶段推进，requirePerms 控制 |
| `/api/enterprise` | 企业排名 | `GET /rank`（暂无鉴权） |

新增接口按 `api-development-guide.md` 的顺序：repository → service → controller → route → app.js 挂载。

## 开发命令（在本目录执行）

- `npm run dev`：watch 模式启动，修改文件自动重启。
- `npm start`：普通启动。
- 验证接口：`curl http://localhost:3000/api/...`（需登录的接口携带 `Authorization: Bearer <accessToken>`）。

## 开发约定

- CommonJS：`require` / `module.exports`，禁止混用 ESM。
- 项目内引用统一使用 `@/` 别名。
- 新增代码提供中文注释；导出函数用 JSDoc 标注参数与返回值。
- 复用优先：常量进 `constants/`，工具进 `utils/`，不为单一用途增加抽象层。
- `.env` 不入库（已在 .gitignore），不在代码/文档中出现真实密钥。

## AI 协作规则

- 改动前先读上述规则文件，按现有代码风格续写，不重新造轮子。
- 所有代码修改先列出「改了哪些文件、为什么」，经用户确认后才落盘。
- 交付前用 `node --check` 或启动服务 + curl 验证；不新建临时验证页面。
