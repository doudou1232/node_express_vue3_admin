# 管理端项目说明与开发规则

## Codex 规则目录

详细规则位于仓库根目录 `.codex/rules/`（即 `../.codex/rules/`），开始处理本项目任务时，按以下优先级读取：

1. `../.codex/rules/project-overview.md`：始终读取，了解全栈架构与前后端连接关系。
2. `../.codex/rules/directory-structure.md`：始终读取，了解前端目录约束与新增文件存放位置。
3. `../.codex/rules/coding-standards.md`：始终读取，了解前端代码编写规范（Vue 3 组件结构、Pinia、HTTP、路由等）。
4. `../.codex/rules/config-reference.md`：修改配置前读取，了解 Vite、TypeScript、lint 工具链配置。

## 项目定位

本项目基于 `pure-admin-thin` 官方精简脚手架，使用 Vue 3、Vite、TypeScript、Pinia 和 Element Plus。脚手架负责布局、左侧菜单、多页签和基础路由；业务代码只放在对应的 `api`、`store`、`router` 和 `views` 目录中。

## 当前工作区

- `../admin-backend/index.js`：Node.js + Express 后端项目入口（后端代码统一在 `admin-backend/` 目录）。
- `admin-frontend/`：本目录，Vue 管理端项目。
- Vite 开发服务器默认端口为 `8848`。
- `/api` 请求代理到后端 `http://localhost:3000`。

## 目录约定

- `src/router/modules/`：新增菜单和页面路由。
- `src/views/`：页面组件。
- `src/api/`：HTTP 请求定义和响应类型。
- `src/store/modules/`：Pinia 状态管理。
- `src/layout/`：脚手架布局，不随意修改。

## 用户管理流程

```text
views/users → Pinia store → api/users → Vite /api 代理 → Node GET /api/users → MySQL
```

## 开发命令

- `pnpm install`：安装依赖。
- `pnpm dev`：启动前端开发服务。
- `pnpm typecheck`：执行 TypeScript 检查。

## 开发约定

- 复用脚手架已有布局、路由和 Element Plus 组件，不重新搭建管理端框架。
- 使用 TypeScript 和 `<script setup lang="ts">` 编写新增页面。
- API 响应错误必须给用户明确反馈，加载状态必须可见。
- 新增功能后至少执行类型检查或开发服务器验证。
