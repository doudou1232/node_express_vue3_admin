/**
 * 办件状态代码集。
 * 状态值同时写进了数据库字段注释，改动时需同步更新建表语句。
 */

/** 办件主表状态（biz_case.status） */
const CASE_STATUS = Object.freeze({
  /** 待受理 */
  PENDING: 1,
  /** 办理中 */
  PROCESSING: 2,
  /** 已办结 */
  FINISHED: 3,
  /** 已驳回 */
  REJECTED: 4,
  /** 已撤销 */
  CANCELLED: 5
});

/** 办件阶段状态（biz_case_stage.status） */
const STAGE_STATUS = Object.freeze({
  /** 未开始 */
  NOT_STARTED: 1,
  /** 进行中 */
  RUNNING: 2,
  /** 已完成 */
  FINISHED: 3,
  /** 已驳回 */
  REJECTED: 4
});

module.exports = { CASE_STATUS, STAGE_STATUS };
