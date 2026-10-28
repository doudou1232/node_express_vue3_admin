---
description: 配置文件参考——环境变量、数据库、Vite、TypeScript、lint 配置说明
globs:
  - "**/package.json"
  - "**/.env"
  - "**/.env.*"
  - "**/vite.config.ts"
  - "**/tsconfig.json"
  - "**/database.js"
  - "**/eslint.config.js"
  - "**/.prettierrc.js"
alwaysApply: false
---

# 后端配置

## `.env` 环境变量

```ini
PORT=3000          # Express 监听端口
DB_HOST=127.0.0.1  # MySQL 地址
DB_PORT=3306       # MySQL 端口
DB_USER=root       # MySQL 用户名
DB_PASSWORD=...    # MySQL 密码
DB_NAME=test_db    # 数据库名
```

- `index.js` 中 `require('dotenv').config()` 必须在其他业务模块加载前执行。
- `database.js` 中通过 `process.env.DB_*` 读取，提供默认值兜底。
- `.env` 已加入 `.gitignore`，不要提交到仓库。

## `package.json`

```json
{
  "_moduleAliases": { "@": "src" },
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  }
}
```

- `_moduleAliases` 定义 `@/` 别名，与 `module-alias` 配合使用。
- `npm run dev` 使用 Node.js 原生 `--watch` 模式，修改文件后自动重启。

## `src/config/database.js`

- 使用 `mysql2/promise` 的 `createPool` 创建连接池。
- `connectionLimit: 10`：最大连接数。
- `waitForConnections: true`：连接满时排队等待。
- 导出的是连接池实例，repository 中通过 `pool.query(sql)` 或 `pool.execute(sql, values)` 使用。

# 前端配置

## 环境变量文件

| 文件 | 用途 |
|------|------|
| `.env.development` | 开发环境（端口 8848、hash 路由） |
| `.env.production` | 生产环境 |
| `.env.staging` | 预发布环境 |

关键变量：

```ini
VITE_PORT=8848              # 开发服务器端口
VITE_PUBLIC_PATH=/          # 部署基础路径
VITE_ROUTER_HISTORY="hash"  # 路由模式
```

## `vite.config.ts`

- **代理**：`/api` → `http://localhost:3000`（对接后端 Express）。
- **端口**：从 `.env.development` 的 `VITE_PORT` 读取。
- **构建**：目标 ES2015，产物按类型分目录（`static/js/`、`static/css/` 等）。
- **插件**：通过 `build/plugins.ts` 中的 `getPluginsList()` 统一管理。
- **依赖预构建**：通过 `build/optimize.ts` 的 `include`/`exclude` 控制。

## `tsconfig.json`

- 严格模式开启，`@/` 路径别名已配置。
- 运行 `pnpm typecheck` 执行 `tsc --noEmit` + `vue-tsc --noEmit`。

## Lint 工具链

| 工具 | 配置文件 | 运行命令 |
|------|----------|----------|
| ESLint 9 | `eslint.config.js` | `pnpm lint:eslint` |
| Prettier | `.prettierrc.js` | `pnpm lint:prettier` |
| Stylelint | `stylelint.config.js` | `pnpm lint:stylelint` |
| Commitlint | `commitlint.config.js` | Git hook 自动检查 |
| Husky + lint-staged | `.husky/` + `.lintstagedrc` | Git commit 时自动运行 |

- `pnpm lint` 依次执行 ESLint → Prettier → Stylelint。
- `--max-warnings 0`：ESLint 不允许任何 warning。

## pnpm 配置

- `.npmrc` 中设置了 `shamefully-hoist=true`（pure-admin 框架要求）。
- `preinstall` 脚本强制使用 pnpm（`npx only-allow pnpm`）。
- Node 版本要求：`^20.19.0 || >=22.13.0`（见 `.nvmrc` 和 `package.json` engines）。
