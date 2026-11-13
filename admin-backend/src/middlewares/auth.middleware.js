const { getCurrentUser } = require('@/services/auth.service');

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

module.exports = { authenticate, extractToken };
