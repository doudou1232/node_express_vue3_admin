const { getCurrentUser } = require('@/services/auth.service');
const { ALL_PERMISSIONS } = require('@/constants/permission');

/**
 * 从 Authorization 请求头中取出 Bearer token。
 * 前端 formatToken 拼的是 `Bearer xxx`，这里做反向解析。
 * @param {import('express').Request} request 请求对象
 * @returns {string|null} token 字符串，无凭证返回 null
 */
function extractToken(request) {
  const header = request.headers.authorization;
  if (!header) return null;

  const [scheme, token] = String(header).split(' ');
  if (!/^Bearer$/i.test(scheme) || !token) return null;

  return token;
}

/**
 * token 校验中间件。
 * 校验通过后把用户画像挂到 request.user，控制器可直接取当前登录人。
 * 失败时沿用项目响应约定：HTTP 200 + body.code 401，前端据此跳转登录页。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 * @param {import('express').NextFunction} next 下一个中间件
 */
async function authenticate(request, response, next) {
  const token = extractToken(request);
  if (!token) {
    return response.status(200).json({
      code: 401,
      message: '未登录或登录已过期',
      data: null
    });
  }

  try {
    const user = await getCurrentUser(token);
    if (!user) {
      return response.status(200).json({
        code: 401,
        message: '未登录或登录已过期',
        data: null
      });
    }
    // 挂载当前登录用户信息到request中，便于控制器（中间件也可以使用）直接用 request.user 访问用户信息
    request.user = user;
    return next();
  } catch (error) {
    console.error('token 校验失败：', error.message);
    return response.status(200).json({
      code: 500,
      message: 'token 校验失败',
      data: null
    });
  }
}

/**
 * 权限校验中间件工厂。
 * 必须在 authenticate 之后使用：它依赖 request.user.permissions。
 * 多个权限码之间是「或」的关系，命中任意一个即放行。
 * @param {...string} codes 需要的权限码，如 requirePerms('case:create')
 * @returns {import('express').RequestHandler} 中间件
 */
function requirePerms(...codes) {
  return (request, response, next) => {
    console.log('request.user', request);
    const permissions = request.user?.permissions || [];
    // 通配权限视为拥有全部权限，管理员无需逐项配置
    if (permissions.includes(ALL_PERMISSIONS)) return next();
    if (codes.some(code => permissions.includes(code))) return next();

    return response.status(200).json({
      code: 403,
      message: '没有该操作的权限',
      data: null
    });
  };
}

module.exports = { authenticate, extractToken, requirePerms };
