const { login, refresh } = require('@/services/auth.service');

/**
 * 登录（POST /api/auth/login）。
 * 账号或密码错误统一返回 400，不区分"用户不存在"与"密码错误"，避免用户枚举。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function loginHandler(request, response) {
  const username = request.body?.username ? String(request.body.username).trim() : '';
  const password = request.body?.password ? String(request.body.password) : '';

  if (!username || !password) {
    return response.status(200).json({
      code: 400,
      message: '账号和密码不能为空',
      data: null
    });
  }

  try {
    const result = await login(username, password);
    if (!result) {
      return response.status(200).json({
        code: 400,
        message: '账号或密码错误',
        data: null
      });
    }

    return response.status(200).json({
      code: 200,
      message: '登录成功',
      data: result
    });
  } catch (error) {
    console.error('登录失败：', error.message);
    return response.status(200).json({
      code: 500,
      message: '登录失败',
      data: null
    });
  }
}

/**
 * 刷新 token（POST /api/auth/refresh-token）。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function refreshTokenHandler(request, response) {
  const refreshToken = request.body?.refreshToken;

  if (!refreshToken) {
    return response.status(200).json({
      code: 400,
      message: 'refreshToken 不能为空',
      data: null
    });
  }

  try {
    const result = await refresh(String(refreshToken));
    if (!result) {
      // 401 让前端清空登录态并跳转登录页
      return response.status(200).json({
        code: 401,
        message: '登录已过期，请重新登录',
        data: null
      });
    }

    return response.status(200).json({
      code: 200,
      message: '刷新成功',
      data: result
    });
  } catch (error) {
    console.error('刷新 token 失败：', error.message);
    return response.status(200).json({
      code: 500,
      message: '刷新 token 失败',
      data: null
    });
  }
}

/**
 * 获取当前登录用户（GET /api/auth/profile）。
 * token 校验已在中间件完成，这里直接返回挂载的用户画像。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
function getProfileHandler(request, response) {
  return response.status(200).json({
    code: 200,
    message: '查询成功',
    data: request.user
  });
}

/**
 * 登出（POST /api/auth/logout）。
 * token 为自包含签名、服务端不存会话，登出只需前端清理本地凭证。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
function logoutHandler(request, response) {
  return response.status(200).json({
    code: 200,
    message: '已退出登录',
    data: null
  });
}

module.exports = {
  loginHandler,
  refreshTokenHandler,
  getProfileHandler,
  logoutHandler
};
