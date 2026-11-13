const {
  getCases,
  getCaseDetail,
  createCase,
  modifyCase,
  removeCase,
  goNextStage
} = require('@/services/case.service');
const { CASE_STATUS } = require('@/constants/case');

/**
 * 响应约定与用户模块一致：HTTP 状态码统一 200，业务成败由 body.code 表达
 * （200 成功 / 400 参数错误 / 404 不存在 / 409 冲突 / 500 服务器错误）。
 */

/**
 * 把请求体里的办件字段清洗成可入库的形态。
 * 字符串统一 trim，空串转 null，避免库中出现 '' 与 NULL 两种空值。
 * @param {object} body 请求体
 * @returns {object} 清洗后的办件字段
 */
function normalizeCaseFields(body) {
  const { businessName, deptName, consultPhone, handlerName, applyTime, remark } = body;
  const trimOrNull = value => (value && String(value).trim() ? String(value).trim() : null);

  return {
    businessName: trimOrNull(businessName),
    deptName: trimOrNull(deptName),
    consultPhone: trimOrNull(consultPhone),
    handlerName: trimOrNull(handlerName),
    applyTime: trimOrNull(applyTime),
    remark: trimOrNull(remark)
  };
}

/**
 * 创建办件（POST /api/cases/add）。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function addCase(request, response) {
  const { userid, status = CASE_STATUS.PENDING } = request.body;
  const fields = normalizeCaseFields(request.body);

  if (!userid || !String(userid).trim()) {
    return response.json({ code: 400, message: 'userid 不能为空', data: null });
  }
  if (!fields.businessName) {
    return response.json({ code: 400, message: 'businessName 不能为空', data: null });
  }

  try {
    const record = await createCase({
      userid: String(userid).trim(),
      status: Number(status),
      ...fields
    });

    return response.json({ code: 200, message: '办件创建成功', data: record });
  } catch (error) {
    console.error('创建办件失败：', error.message);
    return response.json({ code: 500, message: '创建办件失败', data: null });
  }
}

/**
 * 查询办件详情（GET /api/cases/:caseguid），主表与阶段时间轴一起返回。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function getCaseByGuid(request, response) {
  let record;
  try {
    record = await getCaseDetail(request.params.caseguid);
  } catch (error) {
    console.error('查询办件失败：', error.message);
    return response.json({ code: 500, message: '查询办件失败', data: null });
  }

  if (!record) {
    return response.json({ code: 404, message: '办件不存在', data: null });
  }

  return response.json({ code: 200, message: '查询成功', data: record });
}

/**
 * 更新办件（POST /api/cases/update），标识取 body.caseguid。
 * 全量更新语义：未传的可选字段会被清空，前端编辑时应带上完整字段。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function updateCase(request, response) {
  const { caseguid, status = CASE_STATUS.PENDING, finishTime = null } = request.body;
  const fields = normalizeCaseFields(request.body);

  if (!caseguid || !String(caseguid).trim()) {
    return response.json({ code: 400, message: 'caseguid 不能为空', data: null });
  }
  if (!fields.businessName) {
    return response.json({ code: 400, message: 'businessName 不能为空', data: null });
  }

  let record;
  try {
    record = await modifyCase(String(caseguid).trim(), {
      ...fields,
      status: Number(status),
      finishTime: finishTime ? String(finishTime).trim() : null
    });
  } catch (error) {
    console.error('更新办件失败：', error.message);
    return response.json({ code: 500, message: '更新办件失败', data: null });
  }

  if (!record) {
    return response.json({ code: 404, message: '办件不存在', data: null });
  }

  return response.json({ code: 200, message: '办件更新成功', data: record });
}

/**
 * 删除办件（POST /api/cases/delete），同时删除其全部阶段。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function deleteCase(request, response) {
  const { caseguid } = request.body;

  if (!caseguid || !String(caseguid).trim()) {
    return response.json({ code: 400, message: 'caseguid 不能为空', data: null });
  }

  let record;
  try {
    record = await removeCase(String(caseguid).trim());
  } catch (error) {
    console.error('删除办件失败：', error.message);
    return response.json({ code: 500, message: '删除办件失败', data: null });
  }

  if (!record) {
    return response.json({ code: 404, message: '办件不存在', data: null });
  }

  return response.json({ code: 200, message: '办件删除成功', data: record });
}

/**
 * 查询办件列表（POST /api/cases），支持按 userid/编号/业务名称/状态筛选。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function getCaseList(request, response) {
  const { userid, caseNo, businessName, status } = request.body || {};
  const filters = {};

  if (userid && String(userid).trim()) {
    filters.userid = String(userid).trim();
  }
  if (caseNo && String(caseNo).trim()) {
    filters.caseNo = String(caseNo).trim();
  }
  if (businessName && String(businessName).trim()) {
    filters.businessName = String(businessName).trim();
  }
  // status 允许为 0，不能用真值判断
  if (status !== undefined && status !== null && status !== '') {
    filters.status = Number(status);
  }

  try {
    const list = await getCases(filters);
    return response.json({ code: 200, message: '查询成功', data: list });
  } catch (error) {
    console.error('查询办件列表失败：', error.message);
    return response.json({ code: 500, message: '查询办件列表失败', data: null });
  }
}

/**
 * 推进办件阶段（POST /api/cases/:caseguid/stage）。
 * 一次调用完成三件事：结束当前阶段、追加新阶段、同步主表状态。
 * @param {import('express').Request} request 请求对象
 * @param {import('express').Response} response 响应对象
 */
async function addCaseStage(request, response) {
  const { caseguid } = request.params;
  const { stageName, handlerName = null, deptName = null, opinion = null, caseStatus } = request.body;

  if (!stageName || !String(stageName).trim()) {
    return response.json({ code: 400, message: 'stageName 不能为空', data: null });
  }
  if (caseStatus === undefined || caseStatus === null || Number.isNaN(Number(caseStatus))) {
    return response.json({ code: 400, message: 'caseStatus 必须是数字', data: null });
  }

  let record;
  try {
    record = await goNextStage({
      caseGuid: caseguid,
      stageName: String(stageName).trim(),
      handlerName: handlerName ? String(handlerName).trim() : null,
      deptName: deptName ? String(deptName).trim() : null,
      opinion: opinion ? String(opinion).trim() : null,
      caseStatus: Number(caseStatus)
    });
  } catch (error) {
    console.error('推进办件阶段失败：', error.message);
    return response.json({ code: 500, message: '推进办件阶段失败', data: null });
  }

  if (!record) {
    return response.json({ code: 404, message: '办件不存在', data: null });
  }

  return response.json({ code: 200, message: '阶段推进成功', data: record });
}

module.exports = {
  addCase,
  getCaseByGuid,
  updateCase,
  deleteCase,
  getCaseList,
  addCaseStage
};
