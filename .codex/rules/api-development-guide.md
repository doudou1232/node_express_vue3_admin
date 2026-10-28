---
description: 后端接口编写顺序与各层可用 API 参考——database、Express Request/Response/Router、服务层
alwaysApply: true
---

# 接口开发顺序

新增一个接口时，按以下顺序从底层到顶层编写，每一步依赖前一步的输出：

```text
① repositories/   → 写 SQL，确定数据怎么存取
② services/       → 封装业务逻辑，确定数据怎么加工
③ controllers/    → 参数校验 + 调 service + 返回响应
④ routes/         → 注册 URL 映射
⑤ app.js          → 挂载路由
⑥ 启动验证        → npm run dev + 接口请求
```

---

# ① Repository 层（数据访问）

## 文件位置

`src/repositories/<资源名>.repository.js`

## 引入方式

```js
const database = require('@/config/database');
```

`database` 是 mysql2 连接池实例（`mysql.createPool()` 的返回值），不是单个连接。

## 可用 API

### `database.query(sql, values?)`

| 属性 | 说明 |
|------|------|
| 用途 | 执行任意 SQL 语句 |
| 参数 | `sql`：SQL 字符串；`values`：可选的参数数组 |
| 返回值 | `[rows, fields]` 数组 |
| `rows`（SELECT） | 结果集数组，每行一个对象 |
| `rows`（INSERT/UPDATE/DELETE） | `ResultSetHeader` 对象 |
| 预处理 | 不会自动做 Prepared Statement，SQL 直接发送 |

**使用场景**：SELECT 查询（不需要传参数、或参数已安全拼接的场景）。

```js
// 无参数查询
const [rows] = await database.query('SELECT * FROM `user` ORDER BY id DESC');
// rows → [{ id: 1, username: '小明', ... }, { id: 2, ... }]
```

```js
// 带参数查询（query 也支持 ? 占位符，但不走 Prepared Statement 缓存）
const [rows] = await database.query('SELECT * FROM `user` WHERE status = ?', [1]);
```

### `database.execute(sql, values)`

| 属性 | 说明 |
|------|------|
| 用途 | 执行 Prepared Statement（预编译 SQL） |
| 参数 | `sql`：含 `?` 占位符的 SQL；`values`：与占位符一一对应的参数数组 |
| 返回值 | `[rows, fields]` 数组 |
| `rows`（SELECT） | 结果集数组 |
| `rows`（INSERT） | `ResultSetHeader`，含 `insertId`（新插入行的自增 ID） |
| `rows`（UPDATE/DELETE） | `ResultSetHeader`，含 `affectedRows`（受影响的行数） |
| 预处理 | ✅ 走 MySQL 二进制协议，SQL 模板与参数分离传输 |
| 安全性 | ✅ 参数不会被拼接到 SQL 中，天然防 SQL 注入 |

**使用场景**：所有带用户输入参数的写操作（INSERT/UPDATE/DELETE），以及带参数的查询。

```js
// INSERT —— 用 result.insertId 获取新记录 ID
const [result] = await database.execute(
  'INSERT INTO `user` (username, phone, gender, status) VALUES (?, ?, ?, ?)',
  [userInfo.username, userInfo.phone, userInfo.gender, userInfo.status]
);
// result.insertId → 新插入行的自增 ID
```

```js
// DELETE —— 用 result.affectedRows 判断是否有数据被删除
const [result] = await database.execute('DELETE FROM `user` WHERE id = ?', [userId]);
if (result.affectedRows === 0) return null; // 没有匹配的行，返回 null 让上层返回 404
```

```js
// UPDATE —— 同样用 affectedRows 判断
const [result] = await database.execute(
  'UPDATE `user` SET status = ? WHERE id = ?',
  [status, userId]
);
if (result.affectedRows === 0) return null;
```

### `query` 与 `execute` 的选择

| 场景 | 推荐 API | 原因 |
|------|----------|------|
| 无参数的 SELECT | `query` | 不需要预处理开销 |
| 带参数的 SELECT | `execute` | 防注入 + 性能 |
| INSERT | `execute` | 需要 `insertId` |
| UPDATE / DELETE | `execute` | 需要 `affectedRows` + 防注入 |
| 复杂 JOIN / 子查询（无参数） | `query` | 简洁 |

## ResultSetHeader 常用属性

| 属性 | 类型 | 说明 | 适用操作 |
|------|------|------|----------|
| `insertId` | number | 新插入行的自增主键值 | INSERT |
| `affectedRows` | number | 受影响的行数（0 表示没有匹配） | INSERT / UPDATE / DELETE |
| `changedRows` | number | 实际被修改的行数（值没变的不算） | UPDATE |
| `warningCount` | number | 警告数 | 任意 |
| `info` | string | 服务器信息（如 "Rows matched: 1 Changed: 1"） | INSERT / UPDATE / DELETE |

## SQL 编写规范

```js
// ✅ 正确：参数化查询 + 反引号表名
const sql = 'DELETE FROM `user` WHERE id = ?';
await database.execute(sql, [userId]);

// ❌ 错误：字符串拼接用户输入
const sql = `DELETE FROM user WHERE id = ${userId}`;
await database.query(sql);
```

---

# ② Service 层（业务逻辑）

## 文件位置

- 写操作：`src/services/<资源名>.service.js`
- 查询操作：`src/services/<资源名>-query.service.js`

## 引入方式

```js
const { addUser, removeUserById } = require('@/repositories/user.repository');
```

## 职责与模式

当前项目采用薄透传模式——service 直接调用 repository 并返回结果。这样做是为了：

1. 保持分层结构完整，后续业务复杂化时有地方放逻辑。
2. 控制器不需要直接依赖 repository，降低耦合。
3. 读写分离到不同文件，职责单一。

```js
// users.service.js（写操作）
const { addUser: insertUser, removeUserById } = require('@/repositories/user.repository');

function createUser(userInfo) {
  return insertUser(userInfo);
}

function removeUser(userId) {
  return removeUserById(userId);
}

module.exports = { createUser, removeUser };
```

```js
// user-query.service.js（查询操作）
const { findAllUsers } = require('@/repositories/user.repository');

function getUsers() {
  return findAllUsers();
}

module.exports = { findAllUsers: getUsers };
```

## 什么时候需要在 service 层写真正的逻辑

当业务需要多步操作或条件判断时，service 层就是放逻辑的地方：

```js
// 示例：删除用户前检查是否存在关联订单
const { removeUserById } = require('@/repositories/user.repository');
const { countOrdersByUserId } = require('@/repositories/order.repository');

async function removeUser(userId) {
  const orderCount = await countOrdersByUserId(userId);
  if (orderCount > 0) {
    throw new Error('USER_HAS_ORDERS'); // 控制器捕获后返回 409
  }
  return removeUserById(userId);
}
```

## 禁止事项

- 不在 service 中接触 `request` / `response`（那是控制器的事）。
- 不在 service 中写 SQL 或直接调用 `database`。

---

# ③ Controller 层（HTTP 控制器）

## 文件位置

`src/controllers/<资源名>.controller.js`

## 引入方式

```js
const { createUser, removeUser } = require('@/services/users.service');
const { findAllUsers } = require('@/services/user-query.service');
```

## Express Request 可用属性

| 属性 | 类型 | 说明 | 使用场景 |
|------|------|------|----------|
| `request.body` | object | POST/PUT 请求的 JSON 体（需 `express.json()` 中间件） | 接收表单数据、JSON 参数 |
| `request.params` | object | URL 路径参数（如 `/delete/:id` 中的 `id`） | 按 ID 操作资源 |
| `request.query` | object | URL 查询字符串（如 `?page=1&size=10`） | 分页、筛选、排序 |
| `request.headers` | object | 请求头对象 | 读取 Authorization、Content-Type 等 |
| `request.method` | string | HTTP 方法名（GET/POST/...） | 日志或调试 |
| `request.url` | string | 请求路径 | 日志或调试 |

### `request.body` 使用示例

```js
// POST /api/users/add  body: { "username": "小明", "phone": "13800138000" }
const { username, phone = null } = request.body;
```

### `request.params` 使用示例

```js
// DELETE /api/users/delete/123  → request.params = { id: "123" }
const userId = Number(request.params.id);
// 注意：params 值是 string，必须转换后才能做数值比较
```

### `request.query` 使用示例

```js
// GET /api/users?page=1&size=10&keyword=小  → request.query = { page: "1", size: "10", keyword: "小" }
const page = Number(request.query.page) || 1;
const size = Number(request.query.size) || 10;
const keyword = request.query.keyword || '';
```

## Express Response 可用方法

| 方法 | 说明 | 使用场景 |
|------|------|----------|
| `response.status(code)` | 设置 HTTP 状态码（链式调用） | 所有需要非 200 状态码的响应 |
| `response.json(obj)` | 发送 JSON 响应（自动设置 Content-Type） | 所有接口的标准响应方式 |
| `response.send(str)` | 发送文本/HTML 响应 | 极少使用（本项目统一用 JSON） |
| `response.sendStatus(code)` | 发送状态码 + 默认文本 | 健康检查等简单场景 |
| `response.redirect(url)` | 重定向 | Web 页面跳转（API 项目极少用） |
| `response.set(key, val)` | 设置响应头 | 需要自定义 Header 时 |

### `response.status().json()` 链式调用示例

```js
// 设置状态码后立即返回 JSON
return response.status(400).json({
  code: 400,
  message: 'username 不能为空',
  data: null
});

// 默认 200 状态码（省略 status()）
return response.json({
  code: 0,
  message: '查询成功',
  data: users
});
```

## 状态码约定

| 状态码 | 含义 | 使用时机 |
|--------|------|----------|
| 200 | 成功（默认） | 查询成功、更新成功、删除成功 |
| 201 | 创建成功 | POST 创建资源成功时 |
| 400 | 参数错误 | 必填字段缺失、类型不匹配 |
| 404 | 资源不存在 | 按 ID 查/改/删时没有匹配的记录 |
| 409 | 冲突 | 唯一键重复（如用户名已存在） |
| 500 | 服务器错误 | catch 块中的兜底响应 |

## 错误码与响应格式

所有接口统一返回 `{ code, message, data }` 格式：

```js
{
  "code": 0,          // 0 = 成功，非 0 = 对应 HTTP 状态码
  "message": "操作成功",
  "data": { ... }     // 业务数据，无数据时传 null
}
```

## 控制器编写模板

### 查询接口（GET）

```js
async function getXxx(request, response) {
  try {
    const result = await findXxx();
    return response.json({ code: 0, message: '查询成功', data: result });
  } catch (error) {
    console.error('查询失败：', error.message);
    return response.status(500).json({ code: 500, message: '查询失败', data: null });
  }
}
```

### 创建接口（POST）

```js
async function addXxx(request, response) {
  // 1. 解构参数 + 提供默认值
  const { name, description = null } = request.body;

  // 2. 参数校验
  if (!name || !String(name).trim()) {
    return response.status(400).json({ code: 400, message: 'name 不能为空', data: null });
  }

  // 3. 类型清洗
  const cleaned = {
    name: String(name).trim(),
    description: description ? String(description).trim() : null
  };

  // 4. 调用 service
  try {
    const item = await createXxx(cleaned);
    return response.status(201).json({ code: 0, message: '创建成功', data: item });
  } catch (error) {
    // 5. 唯一键冲突处理
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ code: 409, message: '名称已存在', data: null });
    }
    console.error('创建失败：', error.message);
    return response.status(500).json({ code: 500, message: '创建失败', data: null });
  }
}
```

### 删除接口（DELETE）

```js
async function deleteXxx(request, response) {
  const itemId = Number(request.params.id);

  // 1. URL 参数校验
  if (!Number.isInteger(itemId)) {
    return response.status(400).json({ code: 400, message: 'ID 必须是数字', data: null });
  }

  // 2. 调用 service
  let result;
  try {
    result = await removeXxx(itemId);
  } catch (error) {
    console.error('删除失败：', error.message);
    return response.status(500).json({ code: 500, message: '删除失败', data: null });
  }

  // 3. 查不到数据（repository 返回 null）
  if (!result) {
    return response.status(404).json({ code: 404, message: '数据不存在', data: null });
  }

  return response.json({ code: 0, message: '删除成功', data: result });
}
```

## 常见 MySQL 错误码

| `error.code` | 含义 | 建议处理 |
|--------------|------|----------|
| `ER_DUP_ENTRY` | 唯一键冲突（重复插入） | 返回 409 |
| `ER_NO_SUCH_TABLE` | 表不存在 | 检查 SQL 中的表名，返回 500 |
| `ER_BAD_FIELD_ERROR` | 字段不存在 | 检查 SQL 中的列名，返回 500 |
| `ER_ACCESS_DENIED_ERROR` | 数据库认证失败 | 检查 .env 中的 DB_USER / DB_PASSWORD |
| `ECONNREFUSED` | 数据库连接被拒绝 | 检查 DB_HOST / DB_PORT 是否正确 |

---

# ④ Route 层（路由定义）

## 文件位置

`src/routes/<资源名>/index.js`

## 引入方式

```js
const express = require('express');
const { addXxx, deleteXxx, getXxx } = require('@/controllers/xxx.controller');
```

## Express Router 可用方法

| 方法 | 说明 | 使用场景 |
|------|------|----------|
| `router.get(path, handler)` | 注册 GET 路由 | 查询列表、查询单条 |
| `router.post(path, handler)` | 注册 POST 路由 | 创建资源 |
| `router.put(path, handler)` | 注册 PUT 路由 | 全量更新资源 |
| `router.patch(path, handler)` | 注册 PATCH 路由 | 部分更新资源 |
| `router.delete(path, handler)` | 注册 DELETE 路由 | 删除资源 |
| `router.all(path, handler)` | 注册所有方法的路由 | 中间件、日志 |
| `router.use(path, middleware)` | 注册路由级中间件 | 路由内通用处理（如鉴权） |

## 路径参数语法

```js
// :id → 匹配一段路径，可通过 request.params.id 获取
router.delete('/delete/:id', deleteXxx);

// :id/:action → 匹配两段路径
router.post('/:id/status', updateStatus);
```

## 路由编写模板

```js
const express = require('express');
const { addArticle, deleteArticle, getArticles } = require('@/controllers/article.controller');

const router = express.Router();

router.post('/add', addArticle);           // POST /api/articles/add
router.delete('/delete/:id', deleteArticle); // DELETE /api/articles/delete/:id
router.get('/', getArticles);               // GET  /api/articles

module.exports = router;
```

## RESTful 路径命名约定

| 操作 | 方法 | 路径模式 | 示例 |
|------|------|----------|------|
| 查询列表 | GET | `/` | `GET /api/users` |
| 查询单条 | GET | `/:id` | `GET /api/users/1` |
| 创建 | POST | `/add` | `POST /api/users/add` |
| 全量更新 | PUT | `/:id` | `PUT /api/users/1` |
| 部分更新 | PATCH | `/:id` | `PATCH /api/users/1` |
| 删除 | DELETE | `/delete/:id` | `DELETE /api/users/delete/1` |

当前项目使用 `/add` 和 `/delete/:id` 的动词式风格，保持一致即可。

---

# ⑤ App 挂载（`src/app.js`）

## 可用 API

| 方法 | 说明 | 使用场景 |
|------|------|----------|
| `app.use(path, router)` | 挂载子路由到指定前缀 | 注册业务路由 |
| `app.use(middleware)` | 注册全局中间件 | `express.json()`、日志、CORS |
| `app.get(path, handler)` | 注册应用级 GET 路由 | 健康检查 `/` |
| `express.json()` | 解析 JSON 请求体中间件 | 必须在使用 `request.body` 前注册 |

## 挂载新路由

```js
// 在 app.js 中添加两行：
const articleRoutes = require('@/routes/articles');
app.use('/api/articles', articleRoutes);
```

## 完整 app.js 结构

```js
const express = require('express');
const userRoutes = require('@/routes/users');
const articleRoutes = require('@/routes/articles'); // ← 新增

function createApp() {
  const app = express();

  app.use(express.json()); // 必须在路由前，否则 request.body 是 undefined

  app.get('/', (request, response) => {
    response.json({ message: 'Express 项目已成功运行' });
  });

  app.use('/api/users', userRoutes);
  app.use('/api/articles', articleRoutes); // ← 新增

  return app;
}

module.exports = createApp();
```

---

# ⑥ 启动与验证

```bash
npm run dev          # 启动服务（watch 模式，修改文件自动重启）
npm start            # 启动服务（普通模式）
```

验证接口：

```bash
# GET 请求（浏览器或 curl）
curl http://localhost:3000/api/users

# POST 请求
curl -X POST http://localhost:3000/api/users/add \
  -H "Content-Type: application/json" \
  -d '{"username":"小明","phone":"13800138000"}'

# DELETE 请求
curl -X DELETE http://localhost:3000/api/users/delete/1
```
