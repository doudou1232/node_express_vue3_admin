---
description: 代码编写规范——命名、注释、分层职责、异步处理、安全与禁止事项
alwaysApply: true
---

# 通用规范（前后端均适用）

- 新增代码必须提供易读的中文注释。
- 修改完成后通过 `npm start` / `pnpm dev` 或接口请求验证。
- 新增功能时优先复用现有模块，不为单一用途增加复杂抽象。
- 提交信息遵循 Conventional Commits（前端已有 commitlint 强制检查）。

# 后端规范

## 模块系统

- 使用 CommonJS：`require(...)` / `module.exports`。
- 禁止在同一个文件中混用 `require` 和 `import`。

## 分层职责

- `index.js` 只负责启动，不写业务逻辑。
- `app.js` 只负责创建 Express 实例、注册中间件和路由挂载。
- 路由文件只写 `router.METHOD(path, controllerFn)` 映射，不写处理逻辑。
- 控制器负责：参数校验 → 调用 service → 返回 `response.status(code).json(...)`。
- service 负责：业务逻辑封装，调用 repository 或 utils。
- repository 负责：编写 SQL，使用参数化查询（`?` 占位符），不拼接字符串。
- 禁止在控制器中直接写 SQL；禁止在 repository 中做业务判断。

## 异步处理

- 所有数据库操作使用 `async/await`。
- 控制器中 `try...catch` 包裹 service 调用，catch 中返回 500 响应。
- MySQL 唯一键冲突捕获 `error.code === 'ER_DUP_ENTRY'` 返回 409。
- 查不到数据时（`affectedRows === 0`）返回 404。

## 错误处理

- 每个控制器方法的 catch 块中 `console.error` 记录错误信息。
- 返回体始终包含 `code`、`message`、`data` 三个字段。
- `data` 为空时传 `null`，不要省略字段。

## SQL 安全

- 所有 SQL 使用参数化查询：`database.execute(sql, values)`。
- 表名用反引号包裹避免关键字冲突。
- 禁止字符串拼接用户输入到 SQL。

## 命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| 路由文件 | 资源名复数 | `users/index.js` |
| 控制器文件 | `<资源名>.controller.js` | `user.controller.js` |
| 服务文件 | `<资源名>.service.js` | `users.service.js` |
| 仓储文件 | `<资源名>.repository.js` | `user.repository.js` |
| 函数名 | 小驼峰，动词开头 | `createUser`、`findAllUsers` |
| 常量 | 全大写蛇形 | `DB_HOST`、`PORT` |

# 前端规范

## 模块系统

- 使用 ESM：`import ... from ...` / `export ...`。
- 使用 `<script setup lang="ts">` 编写组件。
- 禁止使用 Options API 写新增页面。

## 组件结构

```vue
<script setup lang="ts">
// 1. 导入依赖
// 2. defineOptions 定义组件名
// 3. 状态 / store
// 4. computed
// 5. 函数
// 6. onMounted 等生命周期
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped>
/* 样式 */
</style>
```

## 状态管理

- 使用 Pinia，`defineStore("模块名", { state, actions })`。
- 页面中通过 `storeToRefs()` 解构 store 的响应式属性。
- 异步操作写在 actions 中，`try...finally` 确保 `loading` 复位。

## HTTP 请求

- 所有接口定义放在 `src/api/` 目录中，导出函数 + 响应类型。
- 使用 `http.get<T, P>()` / `http.post<T, P>()` 调用。
- 为每个接口定义 TypeScript 响应类型（`type XxxResponse = { ... }`）。
- 不在页面中直接使用 Axios 实例，统一走 `http` 封装。

## UI 组件

- 优先使用 Element Plus 组件，不手写重复 UI。
- 使用 Element Plus 的 `ElMessage` 做用户反馈。
- 表格使用 `el-table`，表单使用 `el-form`，按钮使用 `el-button`。
- 列表加载状态必须可见（`v-loading` 或按钮 `:loading`）。
- API 请求失败必须给用户明确错误提示（`ElMessage.error`）。

## 路由

- 新页面在 `src/router/modules/` 下新增或修改路由模块。
- 路由组件使用懒加载：`() => import("@/views/xxx/index.vue")`。
- 路由 meta 中设置 `title` 和 `icon`。
- 需要登录才能访问的路由在 `permission.ts` 的白名单外。

## 样式

- 使用 `<style scoped>` 隔离样式。
- 尺寸优先使用 Tailwind CSS 工具类或 CSS 变量。
- 需要穿透子组件样式时使用 `:deep()`。

## TypeScript

- 为 API 响应、Props、Store state 显式声明类型。
- 不使用 `any`（除非确实无法避免，需加注释说明原因）。
- 新增代码后运行 `pnpm typecheck` 验证。

# 禁止事项

- 禁止在后端控制器中直接写 SQL。
- 禁止在前端页面中直接使用 Axios 原始实例（必须通过 `http` 封装）。
- 禁止在 `index.js`（后端入口）中写业务逻辑。
- 禁止在 `layout/` 目录中写业务代码（脚手架布局不随意修改）。
- 禁止跳过参数校验直接操作数据库。
- 禁止在前端使用 `var` 声明变量（使用 `const` / `let`）。
- 禁止在版本控制中提交 `.env` 文件（后端）——已在 `.gitignore` 中排除。
