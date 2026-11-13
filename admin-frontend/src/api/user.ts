import { http } from "@/utils/http";

/** 登录/刷新接口的通用响应结构（HTTP 一律 200，业务成败看 code） */
export type AuthResponse<T> = {
  code: number;
  message: string;
  data: T | null;
};

/** 登录成功后返回的用户画像 */
export type UserResult = AuthResponse<{
  /** 头像 */
  avatar: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 当前登录用户的角色 */
  roles: Array<string>;
  /** 按钮级别权限 */
  permissions: Array<string>;
  /** `token` */
  accessToken: string;
  /** 用于调用刷新`accessToken`的接口时所需的`token` */
  refreshToken: string;
  /** `accessToken`的过期时间（ISO 字符串） */
  expires: string;
}>;

/** 刷新 token 的返回结构，不含用户画像 */
export type RefreshTokenResult = AuthResponse<{
  /** `token` */
  accessToken: string;
  /** 用于调用刷新`accessToken`的接口时所需的`token` */
  refreshToken: string;
  /** `accessToken`的过期时间（ISO 字符串） */
  expires: string;
}>;

/** 登录 */
export const getLogin = (data?: object) => {
  return http.request<UserResult>("post", "/api/auth/login", { data });
};

/** 刷新`token` */
export const refreshTokenApi = (data?: object) => {
  return http.request<RefreshTokenResult>("post", "/api/auth/refresh-token", {
    data
  });
};
