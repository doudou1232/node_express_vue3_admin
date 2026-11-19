import { http } from "@/utils/http";

/** 后端办件主表原始记录（snake_case，applicant_name 来自 sys_user 关联查询） */
type CaseRaw = {
  caseguid: string;
  case_no: string;
  userid: string;
  business_name: string;
  dept_name: string | null;
  consult_phone: string | null;
  handler_name: string | null;
  status: number;
  apply_time: string | null;
  finish_time: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
  applicant_name: string | null;
  /** 已流转到的最大阶段序号，1 表示仅有初始「受理」阶段 */
  max_stage_no: number | string;
};

/** 后端办件阶段原始记录 */
type CaseStageRaw = {
  sort_no: number;
  stage_name: string;
  status: number;
  handler_name: string | null;
  dept_name: string | null;
  start_time: string | null;
  end_time: string | null;
  opinion: string | null;
  create_time: string;
};

/** 页面使用的办件记录（驼峰，时间保持后端返回的字符串） */
export type CaseRecord = {
  caseguid: string;
  caseNo: string;
  userid: string;
  applicantName: string;
  businessName: string;
  deptName: string;
  consultPhone: string;
  handlerName: string;
  status: number;
  applyTime: string;
  finishTime: string;
  remark: string;
  createTime: string;
  updateTime: string;
  /** 已流转到的最大阶段序号，> 1 说明办件已经开始流转 */
  maxStageNo: number;
};

/** 页面使用的办件阶段（时间轴节点） */
export type CaseStage = {
  sortNo: number;
  stageName: string;
  status: number;
  handlerName: string;
  deptName: string;
  startTime: string;
  endTime: string;
  opinion: string;
  createTime: string;
};

/** 办件详情：主表 + 阶段时间轴 */
export type CaseDetail = CaseRecord & { stages: Array<CaseStage> };

/** 列表查询参数 */
export type CaseListParams = {
  /** 申请人 userid */
  userid?: string;
  /** 办件编号，模糊匹配 */
  caseNo?: string;
  /** 业务名称，模糊匹配 */
  businessName?: string;
  /** 办件状态 */
  status?: number;
  /** mine 表示只查当前登录人作为申请人的办件 */
  scope?: "mine";
  page?: number;
  pageSize?: number;
};

/** 分页结果 */
export type CasePageResult = {
  list: Array<CaseRecord>;
  total: number;
  page: number;
  pageSize: number;
};

/** 新增/编辑办件提交字段 */
export type CasePayload = {
  caseguid?: string;
  userid?: string;
  businessName: string;
  deptName?: string | null;
  consultPhone?: string | null;
  handlerName?: string | null;
  /** 申请时间，yyyy-MM-dd HH:mm:ss，为空时后端取当前时间 */
  applyTime?: string | null;
  /** 仅编辑时传：办件状态 */
  status?: number;
  /** 仅编辑时传：办结时间 */
  finishTime?: string | null;
  remark?: string | null;
};

/** 推进阶段提交字段 */
export type CaseStagePayload = {
  stageName: string;
  handlerName?: string | null;
  deptName?: string | null;
  opinion?: string | null;
  /** 推进后的办件状态，3 表示办结 */
  caseStatus: number;
};

/** 通用响应结构：HTTP 恒为 200，业务结果看 code */
type ApiResult<T> = {
  code: number;
  message: string;
  data: T;
};

/** 把后端原始记录转成页面使用的驼峰结构 */
function toCaseRecord(raw: CaseRaw): CaseRecord {
  return {
    caseguid: raw.caseguid,
    caseNo: raw.case_no,
    userid: raw.userid,
    // 申请人被删除时关联为空，回落为「未知用户」而不是留空白
    applicantName: raw.applicant_name ?? "未知用户",
    businessName: raw.business_name,
    deptName: raw.dept_name ?? "",
    consultPhone: raw.consult_phone ?? "",
    handlerName: raw.handler_name ?? "",
    status: Number(raw.status),
    applyTime: raw.apply_time ?? "",
    finishTime: raw.finish_time ?? "",
    remark: raw.remark ?? "",
    createTime: raw.create_time,
    updateTime: raw.update_time,
    maxStageNo: Number(raw.max_stage_no ?? 0)
  };
}

/** 把后端阶段记录转成页面使用的驼峰结构 */
function toCaseStage(raw: CaseStageRaw): CaseStage {
  return {
    sortNo: Number(raw.sort_no),
    stageName: raw.stage_name,
    status: Number(raw.status),
    handlerName: raw.handler_name ?? "",
    deptName: raw.dept_name ?? "",
    startTime: raw.start_time ?? "",
    endTime: raw.end_time ?? "",
    opinion: raw.opinion ?? "",
    createTime: raw.create_time
  };
}

/**
 * 分页查询办件列表。
 * @param params 查询条件与分页参数
 * @returns 转换后的分页结果
 */
export async function getCaseList(params: CaseListParams = {}) {
  const res = await http.post<ApiResult<CasePageResult & { list: Array<CaseRaw> } | null>, CaseListParams>(
    "/api/cases",
    { data: params }
  );

  if (res.code !== 200 || !res.data) return { ...res, data: null };

  return {
    ...res,
    data: {
      total: Number(res.data.total),
      page: Number(res.data.page),
      pageSize: Number(res.data.pageSize),
      list: (res.data.list ?? []).map(toCaseRecord)
    }
  };
}

/**
 * 查询办件详情，含阶段时间轴。
 * @param caseguid 办件对外唯一标识
 */
export async function getCaseDetail(caseguid: string) {
  const res = await http.get<ApiResult<(CaseRaw & { stages: Array<CaseStageRaw> }) | null>, void>(
    `/api/cases/${caseguid}`
  );

  if (res.code !== 200 || !res.data) return { ...res, data: null };

  return {
    ...res,
    data: {
      ...toCaseRecord(res.data),
      stages: (res.data.stages ?? []).map(toCaseStage)
    } as CaseDetail
  };
}

/**
 * 新增办件（编号与 caseguid 由后端生成）。
 * @param payload 办件表单
 */
export function addCase(payload: CasePayload) {
  return http.post<ApiResult<{ caseguid: string; case_no: string } | null>, CasePayload>(
    "/api/cases/add",
    { data: payload }
  );
}

/**
 * 更新办件（全量更新语义：未传的可选字段会被清空，编辑时需带完整字段）。
 * @param payload 办件表单，必须包含 caseguid
 */
export function updateCase(payload: CasePayload) {
  return http.post<ApiResult<{ caseguid: string } | null>, CasePayload>(
    "/api/cases/update",
    { data: payload }
  );
}

/**
 * 删除办件（同时删除其全部阶段）。
 * @param caseguid 办件对外唯一标识
 */
export function deleteCase(caseguid: string) {
  return http.post<ApiResult<{ caseguid: string } | null>, { caseguid: string }>(
    "/api/cases/delete",
    { data: { caseguid } }
  );
}

/**
 * 推进办件阶段：后端会在同一事务里结束当前阶段、追加新阶段并同步主表状态。
 * @param caseguid 办件对外唯一标识
 * @param payload 阶段信息
 */
export function addCaseStage(caseguid: string, payload: CaseStagePayload) {
  return http.post<
    ApiResult<{ caseguid: string; stage_name: string; sort_no: number; status: number } | null>,
    CaseStagePayload
  >(`/api/cases/${caseguid}/stage`, { data: payload });
}
