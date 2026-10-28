---
description: 项目全景介绍——技术栈、前后端连接关系、核心架构与请求流向
alwaysApply: true
---

# 项目定位

本项目是一个前后端分离的全栈学习项目，位于同一仓库根目录下，包含两个子项目：

- **后端 API**（`admin-backend/`）：Express 5 + 原生 JavaScript（CommonJS），提供 RESTful 接口。
- **管理后台**（`admin-frontend/`）：基于 `pure-admin-thin` 精简脚手架，Vue 3 + TypeScript + Vite + Pinia + Element Plus。

# 技术栈

## 后端

| 依赖 | 用途 |
|------|------|
| Express 5 | HTTP 框架 |
| mysql2 | MySQL 连接池（`mysql.createPool`） |
| dotenv | 环境变量加载 |
| module-alias | `@/` → `src/` 路径别名 |
| moment | 日期格式化 |

## 前端

| 依赖 | 用途 |
|------|------|
| Vue 3.5 + `<script setup>` | UI 框架（Composition API） |
| TypeScript 5 | 类型安全 |
| Vite 7 | 构建与开发服务器 |
| Pinia 3 | 状态管理 |
| Element Plus | UI 组件库 |
| Tailwind CSS 4 | 原子样式 |
| Axios | HTTP 请求（封装为 `PureHttp`） |
| pnpm | 包管理器（`preinstall` 强制检查） |

# 前后端连接

```text
浏览器 → Vite Dev Server (:8848)
  → proxy "/api" → Express (:3000)
    → mysql2 连接池 → MySQL (test_db)
```

Vite 开发服务器将 `/api` 前缀的请求代理到 `http://localhost:3000`，前端通过 `http.get("/api/users")` 直接调用后端接口。登录和刷新 token 目前走 pure-admin 自带的 mock（`mock/` 目录），尚未对接真实后端认证。

# 请求处理流程（后端）

```text
请求 → routes → controllers → services → repositories → MySQL → 响应
```

- **routes**：URL 与控制器的映射关系，保持极简。
- **controllers**：接收请求参数、校验、调用 service、返回统一格式响应。
- **services**：可复用业务逻辑（当前为薄封装，为后续扩展预留）。
- **repositories**：SQL 查询与持久化，使用参数化查询防注入。

# 统一响应格式

所有 API 返回以下 JSON 结构：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {}
}
```

错误码约定：`0` 成功，`400` 参数错误，`404` 资源不存在，`409` 重复冲突，`500` 服务器内部错误。

# 当前 API 接口

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/` | 健康检查 |
| GET | `/api/users` | 查询全部用户 |
| POST | `/api/users/add` | 创建用户 |
| DELETE | `/api/users/delete/:id` | 按 ID 删除用户 |

# 开发命令

| 项目 | 安装依赖 | 启动开发 | 类型检查 |
|------|----------|----------|----------|
| 后端 | `npm install` | `npm run dev`（watch 模式） | 无 |
| 前端 | `pnpm install` | `pnpm dev` | `pnpm typecheck` |

后端命令需先进入 `admin-backend/` 目录执行；前端命令在 `admin-frontend/` 目录执行。
