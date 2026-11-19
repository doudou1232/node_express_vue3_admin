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

/**
 * 终态：办件到这就结束了，只能查看详情。
 * 与后端 case.service.js 的 CASE_TERMINAL_STATUSES 保持一致。
 */
export const CASE_TERMINAL_STATUSES: Array<number> = [
  CASE_STATUS.FINISHED,
  CASE_STATUS.REJECTED,
  CASE_STATUS.CANCELLED
];

/** 单个办件当前允许的动作 */
export type CaseActionState = {
  /** 能否编辑 / 删除（两者条件相同） */
  editable: boolean;
  /** 能否推进阶段 */
  processable: boolean;
  /** 不能操作时的说明文案，可直接用作按钮 title */
  reason: string;
};

/**
 * 计算办件当前允许的动作，规则与后端 getCaseActionRule 一致：
 *   1. 终态（已办结 / 已驳回 / 已撤销）：只能查看；
 *   2. 已经开始流转（阶段序号 > 1）：不能编辑、删除，仍可推进；
 *   3. 只有「待受理且尚未流转」的办件可以编辑和删除。
 * @param status 办件状态
 * @param maxStageNo 已流转到的最大阶段序号
 * @returns 动作可用性与说明
 */
export function getCaseActionState(
  status: number,
  maxStageNo: number
): CaseActionState {
  const finished = CASE_TERMINAL_STATUSES.includes(Number(status));
  const started = Number(maxStageNo) > 1;
  const editable =
    !finished && !started && Number(status) === CASE_STATUS.PENDING;

  return {
    editable,
    processable: !finished,
    reason: finished
      ? "办件已结束，只能查看详情"
      : started
        ? "办件已开始流转，不能编辑或删除"
        : ""
  };
}
