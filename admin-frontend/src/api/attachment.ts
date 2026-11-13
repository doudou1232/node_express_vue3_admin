import { http } from "@/utils/http";

/** 上传接口返回的文件元数据 */
export type UploadedFile = {
  /** 对外文件标识（UUID），下载/关联业务时使用 */
  fileId: string;
  /** 可访问的相对路径，如 /uploads/user_avatar/2026/11/xxx.png */
  filePath: string;
  /** 原始文件名 */
  originalName: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
};

/** 上传响应（HTTP 层统一 200，业务成败由 code 区分） */
export type UploadFileResponse = {
  code: number;
  message: string;
  data: UploadedFile | null;
};

/** 业务类型：决定后端扩展名白名单与大小上限 */
export type UploadBizType = "user_avatar" | "user_import";

/**
 * 上传单个文件
 * @param file 浏览器 File 对象
 * @param bizType 业务类型
 * @returns 上传结果，成功时 data.filePath 可直接存入业务表
 */
export function uploadFile(file: File, bizType: UploadBizType) {
  const formData = new FormData();
  formData.append("file", file);
  // 上传人由后端从 token 中解析，前端不再传，防止伪造

  return http.post<UploadFileResponse, FormData>(`/api/files/upload/${bizType}`, {
    data: formData,
    // 必须显式覆盖 PureHttp 默认的 application/json，否则 FormData 无法携带 boundary
    headers: { "Content-Type": "multipart/form-data" }
  });
}

/**
 * 生成文件下载地址
 * @param fileId 文件标识
 */
export function getDownloadUrl(fileId: string) {
  return `/api/files/${fileId}/download`;
}
