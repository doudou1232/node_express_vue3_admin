import { http } from "@/utils/http";

export type UserRecord = {
  id: number;
  username: string;
  phone: string | null;
  gender: number;
  status: number;
  create_time: string;
  update_time: string;
};

export type UserListResponse = {
  code: number;
  message: string;
  data: UserRecord[];
};

/** 查询用户列表 */
export function getUserList() {
  return http.get<UserListResponse, undefined>("/api/users");
}
