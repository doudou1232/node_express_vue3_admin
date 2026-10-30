import { http } from "@/utils/http";

export type UserRecord = {
  id: number | string;
  userid: number | string;
  username: string;
  phone: string | null;
  email: string | null;
  gender: number;
  status: number;
  create_time: string;
  update_time: string;
  // 允许后端返回的额外字段
  [key: string]: unknown;
};
/**
 * 用户列表响应
 * @param code 状态码
 * @param message 状态描述
 * @param data 用户记录数组
 */
export type UserListResponse = {
  code: number;
  message: string;
  data: UserRecord[];
};

/** 用户列表查询参数（全部可选；后端 /api/users 暂未消费，先预留传参结构） */
export type UserListParams = {
  /** 用户名 */
  username?: string;
  /** 手机号 */
  phone?: string;
  /** 邮箱 */
  email?: string;
  /** 状态（1 启用 / 0 停用） */
  status?: number;
};

/** 查询用户列表 */
export function getUserList(params?: UserListParams) {
  return http.post<UserListResponse, UserListParams>("/api/users", {
    data: params
  });
}

/** 单个用户详情响应 */
export type UserDetailResponse = {
  code: number;
  message: string;
  data: UserRecord;
};

/** 按 ID 查询用户详情（后端为 GET /api/users/:id，按数字自增 id 查询） */
export function getUserDetailById(id: number | string) {
  return http.get<UserDetailResponse, undefined>(`/api/users/${id}`);
}
