---
description: 代码编写规范——命名、注释、分层职责、异步处理、安全与禁止事项
alwaysApply: true
---

# 通用规范（前后端均适用）

- 新增代码必须提供易读的中文注释，注释写「为什么」，不写「是什么」。
- 复用优先：新增常量进 `constants/`，工具函数进 `utils/`，公共组件复用已有封装；不为单一用途造轮子、不新建重复变量。
- 新增依赖前先确认已有依赖能否覆盖（日期处理：后端 moment、前端 dayjs，不引入新日期库）。
- 修改完成后按各端交付标准验证：后端 curl 实际请求；前端 `pnpm typecheck`。
- 提交信息遵循 Conventional Commits（前端已有 commitlint 强制检查）。
- 所有代码修改先列出「改了哪些文件、为什么」，经用户确认后才落盘。

# 命名规范总表（前后端统一）

| 对象 | 规则 | 示例 |
|------|------|------|
| 变量 | 小驼峰名词，const 优先，需要重赋值才用 let | `caseList`、`filters` |
| 布尔状态 | 名词 + 状态词尾 | `loading`、`formVisible`、`detailVisible` |
| 函数 | 小驼峰，动词开头 | `createUser`、`loadCases` |
| 常量 | 全大写蛇形；后端配 `Object.freeze`，前端配 `as const` | `PERMISSIONS`、`CASE_STATUS_LABELS` |
| 后端文件 | `<资源名>.controller.js` / `.service.js` / `.repository.js`；路由目录用资源复数 | `case.controller.js`、`users/` |
| 前端组件文件 | PascalCase.vue，与组件注册名一致 | `CaseFormDialog.vue` |
| 前端模块文件 | 模块名小驼峰 + .ts | `cases.ts`、`permission.ts` |
| 组件注册名 | PascalCase，`defineOptions` 必写 | `name: "CaseFormDialog"` |
| TS 类型 | 大驼峰；后端原始结构加 Raw 后缀且不导出 | `CaseRecord`、`CaseRaw` |
| 环境变量 | 全大写蛇形，前端加 `VITE_` 前缀 | `DB_HOST`、`VITE_PORT` |
| 权限码 | `资源:动作` 小写冒号式 | `case:create`、`case:view` |
| 路由文件 | 资源名复数目录 | `routes/users/`、`router/modules/cases.ts` |

# 注释规范

## 何时必须写

- 导出函数：JSDoc/块注释写用途、参数、返回值。
- 业务常量：每项说明含义与用途。
- 非直观逻辑：类型转换、边界处理、权限判断等写明原因。
- 显而易见的代码不写注释。

## 后端模板（JSDoc）

```js
/**
 * 把逗号分隔的角色/权限字符串转成数组（去空、去重）。
 * @param {string|Array<string>|null} value 原始值
 * @returns {Array<string>} 数组
 */
function toList(value) { ... }
```

## 前端模板（块注释）

```ts
/** 列表数据与分页状态 */
const caseList = ref<Array<CaseRecord>>([]);

/**
 * 每行可执行动作的映射：终态只能查看，已流转的不能编辑/删除。
 * 用 computed 统一算一次，避免模板里每点一次按钮都重算。
 */
const actionStates = computed(() => { ... });
```

# 后端规范

## 模块系统

- 使用 CommonJS：`require(...)` / `module.exports`。
- 禁止在同一个文件中混用 `require` 和 `import`。
- 项目内引用统一使用 `@/` 别名。

## 分层职责

- `index.js` 只负责启动，不写业务逻辑。
- `app.js` 只负责创建 Express 实例、注册中间件和路由挂载。
- 路由文件只写 `router.METHOD(path, controllerFn)` 映射 + 挂鉴权中间件，不写处理逻辑。
- 控制器负责：参数校验 → 调用 service → 返回 `response.status(code).json(...)`。
- service 负责：业务逻辑封装，调用 repository 或 utils。
- repository 负责：编写 SQL，使用参数化查询（`?` 占位符），不拼接字符串。
- 禁止在控制器中直接写 SQL；禁止在 repository 中做业务判断。

## 认证与权限

- 需登录的路由在 `app.js` 挂载处统一加 `authenticate`；路由内再按操作加 `requirePerms(PERMISSIONS.XXX)`。
- 免鉴权接口（login、refresh-token）在路由文件中注释说明原因。
- 控制器通过 `request.user` 取当前登录人，不重复解析 token。

## 变量与函数

- 模块级常量用 `const` + `Object.freeze`，命名全大写蛇形。
- 控制器导出函数动词开头小驼峰（`addCase`、`getCaseList`）；仅当与中间件概念冲突时用 Handler 后缀（`loginHandler`）。
- 中间件函数名用动词（`authenticate`、`requirePerms`）。

## 异步处理

- 所有数据库操作使用 `async/await`。
- 控制器中 `try...catch` 包裹 service 调用，catch 中返回 500 响应。
- MySQL 唯一键冲突捕获 `error.code === 'ER_DUP_ENTRY'` 返回 409。
- 查不到数据时（`affectedRows === 0`）返回 404。

## 错误处理

- 每个控制器方法的 catch 块中 `console.error` 记录错误信息。
- 返回体始终包含 `code`、`message`、`data` 三个字段；`data` 为空传 `null`，不省略。
- `code` 与 HTTP 状态码一致（200 成功）；唯一特例：未登录/token 过期返回 HTTP 200 + `code: 401`（`authenticate` 统一处理），前端据此跳转登录页。

## SQL 安全

- 所有 SQL 使用参数化查询：`database.execute(sql, values)`。
- 表名用反引号包裹避免关键字冲突。
- 禁止字符串拼接用户输入到 SQL。

# 前端规范

## 模块系统

- 使用 ESM：`import ... from ...` / `export ...`。
- 使用 `<script setup lang="ts">` 编写组件；禁止 Options API 写新增页面。

## 组件结构（script setup 内顺序）

```vue
<script setup lang="ts">
// 1. 导入依赖
// 2. defineOptions({ name: "XxxYyy" }) —— 必写，注册名与文件名一致（PascalCase）
// 3. 状态 / store
// 4. computed
// 5. 函数
// 6. onMounted 等生命周期
</script>

<template>...</template>

<style scoped>...</style>
```

## 组件创建规范

- 页面私有组件放 `src/views/<模块>/components/`，文件 PascalCase.vue。
- 跨模块公共组件放 `src/components/Re<名称>/`（沿用脚手架 Re 前缀），优先复用已有 Re 组件。
- Props 用类型声明 `defineProps<{...}>()`，可选 props 提供默认值；向父组件事件用 `defineEmits`。
- 命名习惯：弹窗 `XxxDialog`、抽屉 `XxxDrawer`、表单 `XxxForm`。

## api 层类型模式

- 每个接口文件固定结构：`XxxRaw`（后端原始 snake_case 结构，不导出）→ `XxxRecord`（页面用驼峰结构，导出）→ `toXxxRecord` 转换函数 → 请求函数。
- 转换函数内完成 snake_case→驼峰、null→空串等清洗，页面不直接使用 Raw 类型。
- 请求参数单独定义 `XxxListParams` 等类型并导出。

## 数据获取与加载状态

- 默认页面直调 api：`loadXxx` + `loading` ref + `try/catch/finally`（finally 复位 loading）+ 失败 `ElMessage.error`。
- 函数命名习惯：`loadXxx` 加载数据、`handleXxx` 事件处理、`openXxx` 打开弹窗/抽屉、`formatXxx` 格式化。
- 跨页面共享的状态才建 Pinia store；页面私有状态用 `ref` / `computed`。
- 列表删除最后一条后回退一页，避免停在空页。
- 危险操作（删除等）必须 `ElMessageBox.confirm` 二次确认。

## 状态管理

- 使用 Pinia，`defineStore("模块名", { state, actions })`。
- 页面中通过 `storeToRefs()` 解构 store 的响应式属性。
- 异步操作写在 actions 中，`try...finally` 确保 `loading` 复位。

## HTTP 请求

- 所有接口定义放在 `src/api/` 目录中，导出函数 + 响应类型。
- 使用 `http.request<T>("post", url, { data })` 等方式调用；不在页面中直接使用 Axios 实例。
- 响应判断统一 `res.code === 200` 为成功（code 与后端 HTTP 状态码一致）；禁止引入第二种判断风格。

## UI 组件

- 优先使用 Element Plus 组件与 `@pureadmin/*` 封装，不手写重复 UI。
- 使用 `ElMessage` 做用户反馈；列表加载状态必须可见（`v-loading` 或按钮 `:loading`）。
- API 请求失败必须给用户明确错误提示（`ElMessage.error`）。

## 路由

- 新页面在 `src/router/modules/` 下新增或修改路由模块，`satisfies RouteConfigsTable`。
- 路由组件使用懒加载：`() => import("@/views/xxx/index.vue")`。
- 路由 meta 中设置 `title`、`icon`、`rank`；按角色控权限用 `meta.roles`（角色码数组）。
- 父级不放 roles，子级各自设置并在需要时加 `showParent: true`，避免空父级裁剪问题。
- 按钮级权限用 `hasPerms(权限码)` 控制。

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
- 禁止组件文件名使用小驼峰（统一 PascalCase.vue）。
- 禁止引入第二种响应判断风格（统一 `res.code === 200`）。
- 禁止在前端页面直接使用 Raw 类型（必须经 api 层转换）。
- 禁止在版本控制中提交 `.env` 文件——已在 `.gitignore` 中排除。

# 交付前检查

- 后端：`node --check` 相关文件，或 `npm run dev` 启动后 curl 实际请求验证。
- 前端：`pnpm typecheck` 必须通过；页面/渲染类改动不做浏览器视觉验证、不新建临时验证页或挂载页。
- 所有改动已向用户列出清单并经确认后落盘。
