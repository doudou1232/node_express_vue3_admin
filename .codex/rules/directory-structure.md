---
description: 框架目录结构与文件存放规范——新增文件应放在哪里
alwaysApply: true
---

# 后端目录结构

后端项目统一位于仓库根目录的 `admin-backend/` 下，以下结构均为该目录内部布局：

```text
admin-backend/
├── index.js                    # 入口：加载 dotenv + module-alias，require('@/server')
├── .env                        # 环境变量（PORT、DB_*）
├── package.json                # 依赖与 _moduleAliases 配置
├── AGENTS.md                   # 后端开发规则
└── src/
    ├── app.js                  # createApp()：Express 实例、中间件、路由挂载
    ├── server.js               # 读取 PORT 并 app.listen()
    ├── routes/                 # 路由定义，只写 URL → 控制器映射
    │   └── users/
    │       └── index.js        # 用户相关路由
    ├── controllers/            # 接收参数、校验、调 service、返回响应
    │   └── user.controller.js
    ├── services/               # 业务逻辑（可复用）
    │   └── users.service.js    # 用户模块（查询 + 增删改）
    ├── repositories/           # SQL 查询与数据持久化
    │   └── user.repository.js
    ├── config/
    │   └── database.js         # mysql2 连接池
    └── utils/
        └── utils.js            # formatDate 等通用函数
```

## 后端新增文件决策表

| 要新增什么 | 放在哪里 |
|-----------|----------|
| 新的 REST 资源路由 | `src/routes/<资源名>/index.js` |
| 路由处理函数（参数校验、响应） | `src/controllers/<资源名>.controller.js` |
| 可复用业务逻辑 | `src/services/<资源名>.service.js` |
| SQL 查询、INSERT/UPDATE/DELETE | `src/repositories/<资源名>.repository.js` |
| 数据库连接或基础设施配置 | `src/config/` |
| 通用工具函数 | `src/utils/` |

# 前端目录结构

```text
admin-frontend/
├── index.html                  # SPA 入口 HTML
├── vite.config.ts              # Vite 配置（代理、插件、构建）
├── tsconfig.json               # TypeScript 配置
├── .env.development            # 开发环境变量
├── .env.production             # 生产环境变量
├── .env.staging                # 预发布环境变量
├── mock/                       # Mock 数据（登录、动态路由等）
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
    │   ├── user.ts             # 登录/刷新 token
    │   ├── users.ts            # 用户列表
    │   └── routes.ts           # 动态路由获取
    ├── assets/                 # 静态资源（iconfont、图片等）
    ├── components/             # 公共组件
    │   └── ReIcon/             # Iconify 图标封装
    ├── config/                 # 平台配置
    ├── directives/             # 自定义指令（权限等）
    ├── layout/                 # 脚手架布局（侧栏、导航栏、多页签）——不随意修改
    ├── plugins/                # Element Plus 按需引入等
    ├── router/
    │   ├── index.ts            # 路由实例
    │   └── modules/            # 按业务拆分的路由模块
    │       ├── home.ts
    │       ├── remaining.ts
    │       └── users.ts        # 用户管理路由
    ├── store/
    │   ├── index.ts            # setupStore(app)
    │   └── modules/            # Pinia 模块
    │       ├── app.ts          # 应用状态（侧栏折叠等）
    │       ├── epTheme.ts      # 主题
    │       ├── multiTags.ts    # 多页签
    │       ├── permission.ts   # 路由权限
    │       ├── settings.ts     # 平台设置
    │       ├── user.ts         # 登录用户信息
    │       └── users.ts        # 用户列表数据
    ├── style/                  # 全局样式（reset + index + tailwind）
    ├── utils/
    │   ├── http/               # Axios 封装（token 刷新、拦截器）
    │   ├── auth.ts             # token 读写
    │   ├── message.ts          # 消息提示
    │   ├── mitt.ts             # 事件总线
    │   └── ...
    └── views/                  # 页面组件
        ├── login/
        ├── welcome/
        ├── users/
        │   └── index.vue       # 用户列表页
        ├── error/
        └── permission/
```

## 前端新增文件决策表

| 要新增什么 | 放在哪里 |
|-----------|----------|
| 新页面组件 | `src/views/<模块名>/index.vue`（或子组件文件） |
| 新路由 | `src/router/modules/<模块名>.ts` |
| 新接口定义 + 类型 | `src/api/<模块名>.ts` |
| 新 Pinia 状态模块 | `src/store/modules/<模块名>.ts` |
| 公共可复用组件 | `src/components/Re<组件名>/` |
| 全局样式 | `src/style/` |
| 工具函数 | `src/utils/` |
| 自定义指令 | `src/directives/` |
| Mock 数据 | `mock/` |

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
