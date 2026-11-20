# Vue3 管理端项目说明与开发规则

## 规则文件（开始任务前按序读取）

详细规则位于仓库根目录 `../.codex/rules/`（前后端共享）：

1. `../.codex/rules/project-overview.md`：始终读取——全栈架构、认证与权限体系。
2. `../.codex/rules/directory-structure.md`：始终读取——前端目录约束与新增文件存放位置。
3. `../.codex/rules/coding-standards.md`：始终读取——Vue3 组件结构、命名、注释、TypeScript 规范。
4. `../.codex/rules/config-reference.md`：修改配置前读取——Vite / TS / lint 工具链。
5. `../.codex/rules/api-development-guide.md`：理解后端接口约定时读取。

## 项目定位

基于 `pure-admin-thin` 精简脚手架（Vue 3.5 + TypeScript + Vite 7 + Pinia 3 + Element Plus + Tailwind CSS 4）。脚手架负责布局、左侧菜单、多页签和路由框架；业务代码只写进 `api`、`constants`、`store`、`router/modules`、`views`。

## 架构与数据流

```text
views/<模块>/index.vue ─┬─ 默认：直接调 src/api/<模块>.ts
                        └─ 跨页面共享状态时：src/store/modules/<模块>.ts
src/api/<模块>.ts → PureHttp（自动带 token、401 拦截、刷新重试）
                  → Vite /api 代理 → Express :3000 → MySQL
```

- 登录已对接真实后端：`api/user.ts` 的 `getLogin` / `refreshTokenApi` → `/api/auth/*`；`mock/` 仅保留脚手架演示数据。
- 权限双层控制：
  - 菜单/路由级：`router/modules/<模块>.ts` 的 `meta.roles`（角色码数组，登录后由后端下发）。
  - 按钮级：`hasPerms(权限码)`（权限码如 `case:create`，登录后由后端下发 permissions）。
- 响应判断：`res.code === 200` 为成功（code 与后端 HTTP 状态码一致）；HTTP 200 + `code: 401` 由 http 封装拦截并跳转登录。

## 目录约定

- `src/router/modules/<模块>.ts`：菜单路由，`meta.title/icon/rank/roles`。
- `src/views/<模块>/index.vue`：页面；页面私有组件放 `src/views/<模块>/components/`（PascalCase.vue）。
- `src/api/<模块>.ts`：接口函数 + 类型定义（Raw 原始结构 → 驼峰页面类型）+ 转换函数。
- `src/constants/<模块>.ts`：展示常量（状态文案、标签色、权限码引用）。
- `src/store/modules/`：仅跨页面共享的状态才建（现有 user / permission / users / app / epTheme / multiTags / settings）。
- `src/components/Re*/`：跨模块公共组件（脚手架已有，优先复用）。
- `src/layout/`：脚手架布局，不修改。

## 开发命令（在本目录执行，包管理器强制 pnpm）

- `pnpm dev`：启动开发服务（端口 8848）。
- `pnpm typecheck`：`tsc` + `vue-tsc` 类型检查（交付前必跑）。
- `pnpm lint`：ESLint → Prettier → Stylelint（commit 时 husky + lint-staged 自动执行）。

## 开发约定

- `<script setup lang="ts">` + `defineOptions({ name: "XxxYyy" })`；禁止 Options API。
- 优先复用 Element Plus 组件与 `@pureadmin/*` 封装，不手写重复 UI。
- 加载状态必须可见（`v-loading` / 按钮 `:loading`）；请求失败必须 `ElMessage.error` 明确反馈。
- 提交信息遵循 Conventional Commits（commitlint 强制检查）。

## AI 协作规则

- 改动前先读上述规则文件，按现有代码风格续写，能复用的接着复用，不重新造轮子。
- 所有代码修改先列出「改了哪些文件、为什么」，经用户确认后才落盘。
- 页面/渲染类改动不做浏览器视觉验证、不新建临时验证页或挂载页；交付标准是类型检查通过 + 接口对接正确。
