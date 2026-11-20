---
description: 项目全景介绍——技术栈、前后端连接关系、认证与权限体系、请求流向
alwaysApply: true
---

# 项目定位

前后端分离的管理后台（人员管理、办件管理、企业排名、附件上传），同一仓库两个子项目：

- **后端 API**（`admin-backend/`）：Express 5 + 原生 JavaScript（CommonJS），自研 token 认证 + 权限码体系。
- **管理后台**（`admin-frontend/`）：基于 `pure-admin-thin` 精简脚手架，Vue 3 + TypeScript + Vite + Pinia + Element Plus。

# 技术栈

## 后端

| 依赖 | 用途 |
|------|------|
| Express 5 | HTTP 框架 |
| mysql2 | MySQL 连接池（`mysql.createPool`） |
| dotenv | 环境变量加载 |
| module-alias | `@/` → `src/` 路径别名 |
| multer | multipart 上传（类型白名单见 `config/storage.js`） |
| moment | 日期格式化 |
| uuid | 标识生成 |
| （无依赖） | `utils/token.js` 自研 HMAC-SHA256 双 token（结构类似 JWT，不引第三方库） |

## 前端

| 依赖 | 用途 |
|------|------|
| Vue 3.5 + `<script setup>` | UI 框架（Composition API） |
| TypeScript 5 | 类型安全 |
| Vite 7 | 构建与开发服务器（端口 8848） |
| Pinia 3 | 状态管理 |
| Element Plus + @pureadmin/table 等 | UI 组件库与表格封装 |
| Tailwind CSS 4 | 原子样式 |
| Axios（封装为 PureHttp） | HTTP：自动带 token、401 拦截、刷新后重试原请求 |
| dayjs | 日期处理 |
| pnpm | 包管理器（`preinstall` 强制检查） |

# 前后端连接

```text
浏览器 → Vite Dev Server (:8848)
  → proxy "/api" → Express (:3000)
    → authenticate（token 校验，挂 request.user）
    → requirePerms（权限码校验）
    → mysql2 连接池 → MySQL
```

- 登录已对接真实后端：`POST /api/auth/login` 返回 accessToken / refreshToken / 用户画像（roles、permissions）；`mock/` 仅保留脚手架演示数据。
- token：`utils/token.js` 自签 HMAC-SHA256（`base64url(payload).base64url(signature)`），校验不查库；accessToken 过期由前端 http 封装用 refreshToken 刷新后重试原请求。

# 请求处理流程（后端）

```text
请求 → routes → controllers → services → repositories → MySQL → 响应
```

- **routes**：URL 与控制器映射 + 挂 `authenticate` / `requirePerms`。
- **controllers**：参数校验 → 调 service → 统一格式响应。
- **services**：业务逻辑（当前多为薄透传，复杂逻辑放这里）。
- **repositories**：SQL 查询与持久化，参数化查询防注入。

# 统一响应格式

所有 API 返回 `{ code, message, data }`，`code` 与 HTTP 状态码一致：

| code | HTTP | 含义 |
|------|------|------|
| 200 | 200 | 成功 |
| 400 | 400 | 参数错误 |
| 404 | 404 | 资源不存在 |
| 409 | 409 | 唯一冲突（重复插入） |
| 500 | 500 | 服务器内部错误 |
| 401 | **200** | 未登录/token 过期（唯一特例，前端拦截后跳登录页） |

前端统一用 `res.code === 200` 判断成功；`data` 为空传 `null`，不省略字段。

# 权限体系

- 唯一可信来源：后端 `src/constants/permission.js`（前端 `src/constants/permission.ts` 只做展示映射）。
- 数据库 `sys_user.roles` 存角色码（逗号分隔），`permissions` 存追加权限码；登录时 `resolvePermissions` 计算最终权限集合。
- 角色映射：admin 通配 `*:*:*`；manager / operator / handler / viewer 按表授权，common 无办件权限。
- 后端拦截：`requirePerms(PERMISSIONS.CASE_VIEW)`；前端菜单用 `meta.roles`（角色码），按钮用 `hasPerms('case:create')`（权限码）。
- 新增权限码时前后端 constants 同步添加，并在 `ROLE_PERMISSIONS` 中配置角色授权。

# 业务模块

| 模块 | 后端路由 | 前端入口 |
|------|---------|---------|
| 认证 | `/api/auth` | `views/login` |
| 人员管理 | `/api/users` | `views/users` |
| 办件管理（含阶段推进） | `/api/cases` | `views/cases` |
| 附件上传下载 | `/api/files` | 各模块内嵌调用 |
| 企业排名 | `/api/enterprise` | `views/welcome` 图表 |
| 权限演示 | — | `views/permission` |

# 开发命令

| 项目 | 安装依赖 | 启动开发 | 交付检查 |
|------|----------|----------|----------|
| 后端（admin-backend/） | `npm install` | `npm run dev`（watch 模式） | `node --check` / curl 实际请求 |
| 前端（admin-frontend/） | `pnpm install` | `pnpm dev` | `pnpm typecheck` |
