/**
 * 办件模块的权限与角色常量。
 * 角色码、权限码必须与后端 admin-backend/src/constants/permission.js 保持一致，
 * 前端只用于菜单显隐与按钮显隐，真正的拦截在后端 requirePerms 中间件。
 */

/** 权限码：与后端 PERMISSIONS 一一对应 */
export const CASE_PERMISSIONS = {
  /** 查看办件列表与详情 */
  VIEW: "case:view",
  /** 新增办件 */
  CREATE: "case:create",
  /** 编辑办件 */
  UPDATE: "case:update",
  /** 删除办件 */
  DELETE: "case:delete",
  /** 推进阶段（处理办件） */
  PROCESS: "case:process"
} as const;

/** 角色码 */
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  OPERATOR: "operator",
  HANDLER: "handler",
  VIEWER: "viewer",
  COMMON: "common"
} as const;

/** 角色展示名称，key 与后端 ROLE_LABELS 一致 */
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.ADMIN]: "系统管理员",
  [ROLES.MANAGER]: "办件主管",
  [ROLES.OPERATOR]: "办件受理员",
  [ROLES.HANDLER]: "办件办理人",
  [ROLES.VIEWER]: "办件查看员",
  [ROLES.COMMON]: "普通用户"
};

/** 角色下拉选项：common 无任何办件权限，放在最后，避免被误选 */
export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.MANAGER, label: ROLE_LABELS[ROLES.MANAGER] },
  { value: ROLES.OPERATOR, label: ROLE_LABELS[ROLES.OPERATOR] },
  { value: ROLES.HANDLER, label: ROLE_LABELS[ROLES.HANDLER] },
  { value: ROLES.VIEWER, label: ROLE_LABELS[ROLES.VIEWER] },
  { value: ROLES.COMMON, label: ROLE_LABELS[ROLES.COMMON] }
];

/** 可进入办件模块的角色，用于路由 meta.roles 控制菜单与页面访问 */
export const CASE_ROUTE_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.OPERATOR,
  ROLES.HANDLER,
  ROLES.VIEWER
];

/**
 * 把角色字段（数组或逗号分隔字符串）转成数组。
 * @param roles 后端返回的原始角色字段
 * @returns 角色码数组
 */
export function toRoleList(roles?: string | Array<string> | null): Array<string> {
  if (!roles) return [];
  const list = Array.isArray(roles) ? roles : String(roles).split(",");
  return list.map(item => String(item).trim()).filter(Boolean);
}

/**
 * 把角色数组转成展示文案，未知角色原样显示。
 * @param roles 角色数组或逗号分隔字符串
 * @returns 以「、」连接的文案
 */
export function formatRoles(roles?: string | Array<string> | null): string {
  const list = toRoleList(roles);
  return list.length ? list.map(role => ROLE_LABELS[role] ?? role).join("、") : "-";
}
