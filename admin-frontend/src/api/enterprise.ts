import { http } from "@/utils/http";
/**
 * 企业排名记录
 * 与 sys_enterprise.enterprise_ranking 表字段一一对应，金额单位为十亿美元
 */
export type EnterpriseRankRecord = {
  id: number | string;
  rank_no: number;
  name_cn: string;
  name_en: string;
  business: string;
  country: string;
  sector: string;
  // decimal 字段经 mysql2 返回为字符串，如 "4237.00"
  market_cap_usd_bn: string | number;
  revenue_fy2025_usd_bn: string | number;
  // tinyint(1) 字段返回 0 / 1
  revenue_is_estimate: number | boolean;
  leader: string;
  leader_title: string;
};
export type EnterpriseRankListResponse = {
  code: number;
  message: string;
  data: EnterpriseRankRecord[] | null;
};

export function getEnterpriseRankList() {
  return http.get<EnterpriseRankListResponse, void>("/api/enterprise/rank");
}
