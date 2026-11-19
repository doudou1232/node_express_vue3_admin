const moment = require('moment');
const {
  findCasesPage,
  findCaseByGuid,
  findCaseStateByGuid,
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
/**
 * 终态：办件到这里就结束了，只能查看详情，不能再编辑、推进、删除。
 * 已驳回与已撤销同理属于结束，避免被反复改来改去。
 */
const CASE_TERMINAL_STATUSES = [
  CASE_STATUS.FINISHED,
  CASE_STATUS.REJECTED,
  CASE_STATUS.CANCELLED
];
/** 办件编号流水号位数，当日超过 9999 个办件时自然进位，不做截断 */
const CASE_NO_SEQ_LENGTH = 4;
/** 办件编号流水号起始值 */
const CASE_NO_SEQ_START = 1;
/** 列表默认每页条数 */
const DEFAULT_PAGE_SIZE = 10;
/** 列表单页最大条数，防止前端传入过大值拖慢查询 */
const MAX_PAGE_SIZE = 100;

/**
 * 归一化分页参数：非法值回落默认，超上限截断。
 * @param {object} params 原始分页参数
 * @param {number|string} [params.page] 页码
 * @param {number|string} [params.pageSize] 每页条数
 * @returns {{page: number, pageSize: number}} 归一化后的分页参数
 */
function normalizePagination({ page, pageSize } = {}) {
  const pageNum = Number.parseInt(page, 10);
  const sizeNum = Number.parseInt(pageSize, 10);

  return {
    page: Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1,
    pageSize:
      Number.isInteger(sizeNum) && sizeNum > 0
        ? Math.min(sizeNum, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE
  };
}

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
 * 分页查询办件列表接口。
 * @param {object} options 查询参数
 * @param {object} [options.filters] 筛选条件 { userid, caseNo, businessName, status }
 * @param {number|string} [options.page] 页码
 * @param {number|string} [options.pageSize] 每页条数
 * @returns {Promise<{list: Array, total: number, page: number, pageSize: number}>} 当前页数据、总条数与生效的分页参数
 */
async function getCases({ filters = {}, page, pageSize } = {}) {
  const pagination = normalizePagination({ page, pageSize });
  const result = await findCasesPage({ filters, ...pagination });
  return { ...pagination, ...result };
}

/**
 * 查询办件的可执行动作，供控制器在写操作前做统一校验。
 * 规则：
 *   1. 已办结/已驳回/已撤销（终态）：只能查看详情，不能编辑、推进、删除；
 *   2. 已开始流转（阶段序号 > 1）：不能编辑、删除，只能推进或查看；
 *   3. 仅「待受理且尚未流转」的办件允许编辑与删除。
 * @param {string} caseGuid 办件对外唯一标识
 * @returns {Promise<object|null>} 动作快照，办件不存在返回 null
 */
async function getCaseActionRule(caseGuid) {
  const state = await findCaseStateByGuid(caseGuid);
  if (!state) return null;

  const status = Number(state.status);
  const maxStageNo = Number(state.max_stage_no);
  const finished = CASE_TERMINAL_STATUSES.includes(status);
  const started = maxStageNo > 1;

  return {
    status,
    maxStageNo,
    finished,
    started,
    // 编辑与删除的条件完全一致，抽成同一个布尔值，避免两处判断写歪
    editable: !finished && !started && status === CASE_STATUS.PENDING,
    processable: !finished,
    /** 不能编辑/删除时给前端的说明 */
    editReason: finished
      ? '办件已结束，只能查看详情'
      : started
        ? '办件已开始流转，不能编辑或删除'
        : ''
  };
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
  getCaseActionRule,
  getCaseDetail,
  createCase,
  modifyCase,
  removeCase,
  goNextStage
};
