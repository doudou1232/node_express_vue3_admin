/**
 * 办件状态代码集。
 * 状态值需与后端 backend/src/constants/case.js 保持一致。
 */

/** 办件主表状态（biz_case.status） */
export const CASE_STATUS = {
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
} as const;

/** 办件阶段状态（biz_case_stage.status） */
export const STAGE_STATUS = {
  /** 未开始 */
  NOT_STARTED: 1,
  /** 进行中 */
  RUNNING: 2,
  /** 已完成 */
  FINISHED: 3,
  /** 已驳回 */
  REJECTED: 4
} as const;

/** 办件状态展示文案，key 与 CASE_STATUS 的值一一对应 */
export const CASE_STATUS_LABELS: Record<number, string> = {
  [CASE_STATUS.PENDING]: "待受理",
  [CASE_STATUS.PROCESSING]: "办理中",
  [CASE_STATUS.FINISHED]: "已办结",
  [CASE_STATUS.REJECTED]: "已驳回",
  [CASE_STATUS.CANCELLED]: "已撤销"
};

/** 阶段状态展示文案，key 与 STAGE_STATUS 的值一一对应 */
export const STAGE_STATUS_LABELS: Record<number, string> = {
  [STAGE_STATUS.NOT_STARTED]: "未开始",
  [STAGE_STATUS.RUNNING]: "进行中",
  [STAGE_STATUS.FINISHED]: "已完成",
  [STAGE_STATUS.REJECTED]: "已驳回"
};

/** el-tag 的 type 取值 */
type TagType = "primary" | "success" | "info" | "warning" | "danger";

/** 办件状态对应的 el-tag 颜色，key 与 CASE_STATUS 的值一一对应 */
export const CASE_STATUS_TAG_TYPES: Record<number, TagType> = {
  [CASE_STATUS.PENDING]: "warning",
  [CASE_STATUS.PROCESSING]: "primary",
  [CASE_STATUS.FINISHED]: "success",
  [CASE_STATUS.REJECTED]: "danger",
  [CASE_STATUS.CANCELLED]: "info"
};

/** 阶段状态对应的 el-tag 颜色，key 与 STAGE_STATUS 的值一一对应 */
export const STAGE_STATUS_TAG_TYPES: Record<number, TagType> = {
  [STAGE_STATUS.NOT_STARTED]: "info",
  [STAGE_STATUS.RUNNING]: "primary",
  [STAGE_STATUS.FINISHED]: "success",
  [STAGE_STATUS.REJECTED]: "danger"
};
