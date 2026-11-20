---
description: 框架目录结构与文件存放规范——新增文件应放在哪里
alwaysApply: true
---

# 后端目录结构

后端项目统一位于仓库根目录的 `admin-backend/` 下，以下结构均为该目录内部布局：

```text
admin-backend/
├── index.js                    # 入口：加载 dotenv + module-alias，require('@/server')
├── .env                        # 环境变量（PORT、DB_*、TOKEN_*、UPLOAD_ROOT）
├── AGENTS.md                   # 后端开发规则入口
├── db/                         # SQL 脚本、初始化数据与运维工具（run-sql.js、reset-initial-password.js）
├── uploads/                    # 上传文件实体（数据库只存 /uploads/... 相对路径，不提交 git）
└── src/
    ├── app.js                  # createApp()：Express 实例、中间件、静态托管、路由挂载
    ├── server.js               # 读取 PORT 并 app.listen()
    ├── config/
    │   ├── database.js         # mysql2 连接池
    │   └── storage.js          # 上传根目录、类型白名单、大小上限、路径还原
    ├── constants/
    │   ├── permission.js       # 权限模型（角色/权限码/映射的唯一可信来源）
    │   └── case.js             # 办件业务常量（阶段名等）
    ├── middlewares/
    │   ├── auth.middleware.js  # authenticate（token 校验，挂 request.user）+ requirePerms（权限码）
    │   └── upload.middleware.js# multer 单文件上传（按 UPLOAD_RULES 校验）
    ├── routes/                 # auth/ users/ files/ cases/ enterprise/，仅 URL → 控制器映射
    ├── controllers/            # auth.controller.js user.controller.js case.controller.js attachment.controller.js enterprise.controller.js
    ├── services/               # auth.service.js users.service.js case.service.js attachment.service.js enterprise.service.js
    ├── repositories/           # auth.repository.js user.repository.js case.repository.js attachment.repository.js enterprise.repository.js
    └── utils/                  # token.js（自研双 token）password.js utils.js（formatDate 等）
```

## 后端新增文件决策表

| 要新增什么 | 放在哪里 |
|-----------|----------|
| 新的 REST 资源路由 | `src/routes/<资源名>/index.js` |
| 路由处理函数（参数校验、响应） | `src/controllers/<资源名>.controller.js` |
| 可复用业务逻辑 | `src/services/<资源名>.service.js` |
| SQL 查询、INSERT/UPDATE/DELETE | `src/repositories/<资源名>.repository.js` |
| 数据库连接或基础设施配置 | `src/config/` |
| 权限码 / 角色 / 授权映射 | `src/constants/permission.js`（与前端 constants 同步） |
| 模块业务常量（状态、阶段名） | `src/constants/<模块名>.js` |
| 上传业务类型（白名单+大小） | `src/config/storage.js` 的 `UPLOAD_RULES` |
| 通用工具函数 | `src/utils/` |
| 建表 / 数据初始化脚本 | `db/<日期-说明>.sql` |

# 前端目录结构

```text
admin-frontend/
├── index.html                  # SPA 入口 HTML
├── vite.config.ts              # Vite 配置（代理、插件、构建）
├── tsconfig.json               # TypeScript 配置
├── AGENTS.md                   # 前端开发规则入口
├── mock/                       # Mock 数据（仅脚手架演示，登录已走真实后端）
├── build/                      # Vite 构建辅助（plugins、optimize、utils）
├── public/                     # 静态公共资源
├── types/                      # 全局类型声明
├── eslint.config.js            # ESLint 9 配置
├── .prettierrc.js              # Prettier 配置
├── stylelint.config.js         # Stylelint 配置
├── commitlint.config.js        # Commitlint 提交规范
├── .husky/                     # Git hooks（lint-staged、commit-msg）
└── src/
    ├── main.ts                 # 应用入口：创建 Vue 实例、注册插件/组件/指令
    ├── App.vue                 # 根组件
    ├── api/                    # HTTP 接口定义与响应类型
    │   ├── user.ts             # 登录 / 刷新 token（对接 /api/auth）
    │   ├── users.ts            # 人员管理
    │   ├── cases.ts            # 办件管理（Raw→驼峰转换模式参考）
    │   ├── attachment.ts       # 附件上传下载
    │   ├── enterprise.ts       # 企业排名
    │   └── routes.ts           # 动态路由获取
    ├── constants/              # 业务展示常量
    │   ├── case.ts             # 状态文案、标签色、动作状态
    │   └── permission.ts       # 权限码引用、角色路由映射（与后端同步）
    ├── assets/                 # 静态资源（iconfont、图片等）
    ├── components/             # 公共组件（ReAuth、ReDialog、ReIcon、RePureTableBar 等，复用优先）
    ├── config/                 # 平台配置
    ├── directives/             # 自定义指令（auth/perms 权限、copy、longpress 等）
    ├── layout/                 # 脚手架布局（侧栏、导航栏、多页签）——不随意修改
    ├── plugins/                # Element Plus 按需引入等
    ├── router/
    │   ├── index.ts            # 路由实例
    │   └── modules/            # 按业务拆分的路由模块
    │       ├── home.ts         # 首页/欢迎页
    │       ├── cases.ts        # 办件管理（meta.roles 参考实现）
    │       ├── users.ts        # 用户管理路由
    │       ├── error.ts
    │       └── remaining.ts
    ├── store/
    │   ├── index.ts            # setupStore(app)
    │   └── modules/            # Pinia 模块（仅跨页面共享状态）
    │       ├── user.ts         # 登录用户信息、token
    │       ├── users.ts        # 人员列表
    │       ├── permission.ts   # 路由权限
    │       └── app.ts / epTheme.ts / multiTags.ts / settings.ts
    ├── style/                  # 全局样式（reset + index + tailwind）
    ├── utils/
    │   ├── http/               # Axios 封装（token 自动携带、401 拦截、刷新重试）
    │   ├── auth.ts             # token 读写、hasPerms
    │   ├── message.ts          # 消息提示
    │   └── mitt.ts             # 事件总线
    └── views/                  # 页面组件
        ├── login/              # 登录页
        ├── welcome/            # 欢迎页（含企业排名图表）
        ├── users/              # 人员管理页面
        │   └── components/     # UserDetailDialog.vue、AddOrEditUserDialog.vue
        ├── cases/              # 办件管理页面
        │   └── components/     # CaseFormDialog.vue、CaseDetailDrawer.vue、CaseStageDialog.vue
        ├── permission/         # 权限演示页
        └── error/              # 403/404/500
```

## 前端新增文件决策表

| 要新增什么 | 放在哪里 |
|-----------|----------|
| 新页面组件 | `src/views/<模块名>/index.vue` |
| 页面私有子组件 | `src/views/<模块名>/components/PascalCase.vue` |
| 新路由 | `src/router/modules/<模块名>.ts` |
| 新接口定义 + 类型 + 转换函数 | `src/api/<模块名>.ts` |
| 新 Pinia 状态模块（仅跨页面共享时） | `src/store/modules/<模块名>.ts` |
| 状态文案 / 标签色等展示常量 | `src/constants/<模块名>.ts` |
| 权限码 / 角色路由映射 | `src/constants/permission.ts`（与后端 constants 同步） |
| 公共可复用组件 | `src/components/Re<组件名>/` |
| 全局样式 | `src/style/` |
| 工具函数 | `src/utils/` |
| 自定义指令 | `src/directives/` |
| Mock 数据（仅脚手架演示） | `mock/` |

# 文件引用规范

## 后端（CommonJS）

- 使用 `require('...')` 和 `module.exports`，禁止混用 ESM `import`/`export`。
- 引用项目内模块统一使用 `@/` 别名：`require('@/services/users.service')`。
- `@/` 别名通过 `package.json` 的 `_moduleAliases` 和 `module-alias/register` 实现。
- `index.js` 必须在加载业务模块前完成 `dotenv.config()` 和 `module-alias/register`。

## 前端（ESM + TypeScript）

- 使用 `import` / `export`，禁止混用 CommonJS。
- 项目内引用统一使用 `@/` 别名（`@/store/modules/users`、`@/api/users`）。
- `@` 别名通过 `vite.config.ts` 的 `resolve.alias` 配置。
- 组件引用优先使用相对路径（同目录或近邻），跨模块引用使用 `@/`。
