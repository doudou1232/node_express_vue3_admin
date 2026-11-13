const moment = require('moment');
const {
  findAllCases,
  findCaseByGuid,
  findStagesByCaseGuid,
  findLatestCaseNo,
  addCase,
  updateCaseByGuid,
  removeCaseByGuid,
  advanceStage
} = require('@/repositories/case.repository');
const { CASE_STATUS } = require('@/constants/case');

/** 办件状态：已办结，流转到该状态时需要写入完成时间 */
const CASE_STATUS_FINISHED = CASE_STATUS.FINISHED;
/** 办件编号流水号位数，当日超过 9999 个办件时自然进位，不做截断 */
const CASE_NO_SEQ_LENGTH = 4;
/** 办件编号流水号起始值 */
const CASE_NO_SEQ_START = 1;

/**
 * 生成当日的办件编号，格式 BJ + YYYYMMDD + 4 位流水，如 BJ202611110001。
 * 取当日最大编号加一，不使用随机数，保证编号连续且便于人工核对。
 * @returns {Promise<string>} 办件编号
 */
async function generateCaseNo() {
  const datePart = moment().format('YYYYMMDD');
  const prefix = `BJ${datePart}`;
  const latest = await findLatestCaseNo(prefix);

  // 截取前缀之后的流水段；历史数据若格式异常则回落到起始号
  const latestSeq = latest ? Number(latest.slice(prefix.length)) : 0;
  const nextSeq = Number.isInteger(latestSeq) && latestSeq >= CASE_NO_SEQ_START
    ? latestSeq + 1
    : CASE_NO_SEQ_START;

  return `${prefix}${String(nextSeq).padStart(CASE_NO_SEQ_LENGTH, '0')}`;
}

/**
 * 查询办件列表接口。
 * @param {object} filters 查询条件 { userid, caseNo, businessName, status }
 * @returns {Promise<Array>} 办件列表
 */
function getCases(filters = {}) {
  return findAllCases(filters);
}

/**
 * 查询办件详情接口，主表与阶段时间轴一次返回，减少前端请求次数。
 * @param {string} caseGuid 办件对外唯一标识
 * @returns {Promise<object|null>} 含 stages 的办件详情，不存在返回 null
 */
async function getCaseDetail(caseGuid) {
  const record = await findCaseByGuid(caseGuid);
  if (!record) {
    return null;
  }

  const stages = await findStagesByCaseGuid(caseGuid);
  return { ...record, stages };
}

/**
 * 创建办件接口，办件编号由服务端生成，不信任前端传值。
 * @param {object} caseInfo 办件信息
 * @returns {Promise<object>} 新办件的对外标识与编号
 */
async function createCase(caseInfo) {
  const caseNo = await generateCaseNo();
  return addCase({ ...caseInfo, caseNo });
}

/**
 * 更新办件接口。
 * @param {string} caseGuid 办件对外唯一标识
 * @param {object} caseInfo 更新后的办件信息
 * @returns {Promise<object|null>} 更新结果，不存在返回 null
 */
function modifyCase(caseGuid, caseInfo) {
  return updateCaseByGuid(caseGuid, caseInfo);
}

/**
 * 删除办件接口，同时清理该办件的全部阶段。
 * @param {string} caseGuid 办件对外唯一标识
 * @returns {Promise<object|null>} 删除结果，不存在返回 null
 */
function removeCase(caseGuid) {
  return removeCaseByGuid(caseGuid);
}

/**
 * 推进办件阶段接口。
 * 是否算办结由状态决定，不交给前端传布尔值，避免出现状态与完成时间不一致。
 * @param {object} stageInfo 流转信息
 * @returns {Promise<object|null>} 流转结果，办件不存在返回 null
 */
function goNextStage(stageInfo) {
  return advanceStage({
    ...stageInfo,
    finishTime: Number(stageInfo.caseStatus) === CASE_STATUS_FINISHED
  });
}

module.exports = {
  getCases,
  getCaseDetail,
  createCase,
  modifyCase,
  removeCase,
  goNextStage
};
