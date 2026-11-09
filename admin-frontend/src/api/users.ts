import { http } from "@/utils/http";

export type UserRecord = {
  id?: number | string;
  userid?: number | string;
  username: string;
  phone: string;
  email: string;
  gender: number | string;
  status: number | string;
  create_time?: string;
  update_time?: string;
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
/** 新增用户响应（后端 HTTP 统一 200，业务成败由 code 区分） */
export type AddUserResponse = {
  code: number;
  message: string;
  data: UserRecord | null;
};

/**
 * 新增用户
 * @param user 表单数据（新增场景字段可不完整，用 Partial）
 * @returns 新增结果
 */
export function addUser(user: Partial<UserRecord>) {
  return http.post<AddUserResponse, Partial<UserRecord>>("/api/users/add", {
    data: user
  });
}

/** 删除用户响应（成功 data 为被删除的用户标识，失败为 null） */
export interface DeleteUserResponse {
  code: number;
  message: string;
  data: { userid: number | string } | null;
}
export function deleteUserByUserId(user: { userid: number | string }) {
  return http.post<DeleteUserResponse, { userid: number | string }>(
    "/api/users/delete",
    { data: user }
  );
}

export function updateUserByUserId(user: UserRecord) {
  return http.post<DeleteUserResponse, UserRecord>(
    "/api/users/update",
    { data: user }
  );
}
