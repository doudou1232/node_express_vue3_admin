import { http } from "@/utils/http";

export type UserRecord = {
  id?: number | string;
  userid?: number | string;
  /** 登录用户名，纯英文（可含数字） */
  username: string;
  /** 真实姓名，用于界面展示 */
  realName: string;
  phone: string;
  email: string;
  /** 头像相对路径，由上传接口返回，如 /uploads/user_avatar/2026/11/xxx.png */
  avatar?: string | null;
  /** 明文密码，仅提交时使用；后端只存哈希，列表查询不会返回该字段 */
  password?: string | null;
  gender: number | string;
  status: number | string;
  /** 角色码，库中为逗号分隔字符串，提交时可传数组 */
  roles?: string | Array<string>;
  /** 显式追加的权限码，角色已能覆盖时留空即可 */
  permissions?: string | Array<string>;
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
  /** 登录用户名 */
  username?: string;
  /** 真实姓名 */
  realName?: string;
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

/** 更新用户响应（成功 data 为被更新的用户标识，失败为 null） */
export interface UpdateUserResponse {
  code: number;
  message: string;
  data: { userid: number | string } | null;
}

/**
 * 更新用户（全量更新语义：未传可选字段会被清空，编辑时需带完整字段）
 * @param user 完整用户记录，必须包含 userid
 */
export function updateUserByUserId(user: UserRecord) {
  return http.post<UpdateUserResponse, UserRecord>("/api/users/update", {
    data: user
  });
}

/** 人员选项：办件页面选择申请人 / 办理人时使用，只含标识与姓名 */
export type UserOption = {
  userid: string;
  realName: string | null;
  username: string;
};

/** 人员选项响应 */
export type UserOptionResponse = {
  code: number;
  message: string;
  data: Array<UserOption> | null;
};

/** 查询可指派人员选项（后端只返回启用状态的人员，不含手机号等敏感字段） */
export function getUserOptions() {
  return http.get<UserOptionResponse, void>("/api/users/options");
}
