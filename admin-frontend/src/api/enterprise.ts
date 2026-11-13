import { http } from "@/utils/http";
export type EnterpriseRankRecord = {
  id?: number | string;
  enterprise_id?: number | string;
  rank?: number | string;
  score?: number | string;
  create_time?: string;
  update_time?: string;
  // 允许后端返回的额外字段
  [key: string]: unknown;
};
export type EnterpriseRankListResponse = {
  code: number;
  message: string;
  data: EnterpriseRankRecord[];
};

export function getEnterpriseRankList() {
  return http.get<EnterpriseRankListResponse, void>("/api/enterprise/rank");
}
