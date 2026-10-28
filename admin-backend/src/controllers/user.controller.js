const {
  createUser,
  updateUser: modifyUser,
  removeUser
} = require('@/services/users.service');
const { findAllUsers, findUserById } = require('@/services/user-query.service');

/**
 * 创建用户。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function addUser(request, response) {
  const {
    username,
    phone = null,
    gender = 0,
    status = 1
  } = request.body;

  if (!username || !String(username).trim()) {
    return response.status(400).json({
      code: 400,
      message: 'username 不能为空',
      data: null
    });
  }

  try {
    const user = await createUser({
      username: String(username).trim(),
      phone: phone ? String(phone).trim() : null,
      gender: String(gender),
      status: String(status)
    });

    return response.status(201).json({
      code: 0,
      message: '用户创建成功',
      data: user
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({
        code: 409,
        message: '用户名已存在',
        data: null
      });
    }

    console.error('创建用户失败：', error.message);
    return response.status(500).json({
      code: 500,
      message: '创建用户失败',
      data: null
    });
  }
}

/**
 * 按 ID 查询用户。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function getUserById(request, response) {
  // 路径参数是 string，必须转换为数字后再校验
  const userId = Number(request.params.id);

  if (!Number.isInteger(userId)) {
    return response.status(400).json({
      code: 400,
      message: '用户 ID 必须是数字',
      data: null
    });
  }

  let user;

  try {
    user = await findUserById(userId);
  } catch (error) {
    console.error('查询用户失败：', error.message);
    return response.status(500).json({
      code: 500,
      message: '查询用户失败',
      data: null
    });
  }

  // repository 未找到时返回 null，这里转为 404
  if (!user) {
    return response.status(404).json({
      code: 404,
      message: '用户不存在',
      data: null
    });
  }

  return response.json({
    code: 0,
    message: '查询成功',
    data: user
  });
}

/**
 * 更新用户。
 * 全量更新语义：未传的可选字段会回退为默认值，前端编辑时应带上完整字段。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function updateUser(request, response) {
  const userId = Number(request.params.id);
  const {
    username,
    phone = null,
    gender = 0,
    status = 1
  } = request.body;

  if (!Number.isInteger(userId)) {
    return response.status(400).json({
      code: 400,
      message: '用户 ID 必须是数字',
      data: null
    });
  }

  if (!username || !String(username).trim()) {
    return response.status(400).json({
      code: 400,
      message: 'username 不能为空',
      data: null
    });
  }

  let user;

  try {
    user = await modifyUser(userId, {
      username: String(username).trim(),
      phone: phone ? String(phone).trim() : null,
      gender: String(gender),
      status: String(status)
    });
  } catch (error) {
    // 用户名唯一键冲突返回 409
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({
        code: 409,
        message: '用户名已存在',
        data: null
      });
    }

    console.error('更新用户失败：', error.message);
    return response.status(500).json({
      code: 500,
      message: '更新用户失败',
      data: null
    });
  }

  // service 返回 null 表示没有匹配的行，转为 404
  if (!user) {
    return response.status(404).json({
      code: 404,
      message: '用户不存在',
      data: null
    });
  }

  return response.json({
    code: 0,
    message: '用户更新成功',
    data: user
  });
}

/**
 * 删除用户。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function deleteUser(request, response) {
  const userId = Number(request.params.id);

  if (!Number.isInteger(userId)) {
    return response.status(400).json({
      code: 400,
      message: '用户 ID 必须是数字',
      data: null
    });
  }

  let user;

  try {
    user = await removeUser(userId);
  } catch (error) {
    console.error('删除用户失败：', error.message);
    return response.status(500).json({
      code: 500,
      message: '删除用户失败',
      data: null
    });
  }

  if (!user) {
    return response.status(404).json({
      code: 404,
      message: '用户不存在',
      data: null
    });
  }

  return response.json({
    code: 0,
    message: '用户删除成功',
    data: user
  });
}

/**
 * 查询全部用户。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function getUsers(request, response) {
  try {
    const users = await findAllUsers();

    return response.json({
      code: 0,
      message: '查询成功',
      data: users
    });
  } catch (error) {
    console.error('查询用户失败：', error.message);

    return response.status(500).json({
      code: 500,
      message: '查询用户失败',
      data: null
    });
  }
}

module.exports = {
  addUser,
  getUserById,
  updateUser,
  deleteUser,
  getUsers
};
