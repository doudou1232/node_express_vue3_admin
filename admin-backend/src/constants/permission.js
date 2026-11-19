/**
 * 权限体系定义（后端唯一可信来源）。
 * 设计思路：
 *   1. 数据库 sys_user.roles 存角色码（逗号分隔），permissions 存额外授权的权限码。
 *   2. 登录时由「角色 → 权限码」映射推导出最终权限集合，前端只做展示与按钮显隐，
 *      真正的拦截在 requirePerms 中间件里。
 *   3. 管理员直接拿通配权限 *:*:*，避免新增权限码时漏配。
 */

/** 通配权限，命中即视为拥有全部权限 */
const ALL_PERMISSIONS = '*:*:*';

/** 角色码 */
const ROLE = Object.freeze({
  /** 系统管理员：全部权限 */
  ADMIN: 'admin',
  /** 办件主管：可建、可改、可删、可推进 */
  MANAGER: 'manager',
  /** 办件受理员：只能建单与查看 */
  OPERATOR: 'operator',
  /** 办件办理人：只能查看与自己相关的办件并推进阶段 */
  HANDLER: 'handler',
  /** 办件查看员：只读 */
  VIEWER: 'viewer',
  /** 脚手架默认角色（历史数据），不授予任何办件权限 */
  COMMON: 'common'
});

/** 角色展示名称，用于接口返回与前端下拉 */
const ROLE_LABELS = Object.freeze({
  [ROLE.ADMIN]: '系统管理员',
  [ROLE.MANAGER]: '办件主管',
  [ROLE.OPERATOR]: '办件受理员',
  [ROLE.HANDLER]: '办件办理人',
  [ROLE.VIEWER]: '办件查看员',
  [ROLE.COMMON]: '普通用户'
});

/** 权限码 */
const PERMISSIONS = Object.freeze({
  /** 查看办件列表与详情 */
  CASE_VIEW: 'case:view',
  /** 新增办件 */
  CASE_CREATE: 'case:create',
  /** 编辑办件基础信息 */
  CASE_UPDATE: 'case:update',
  /** 删除办件及其阶段 */
  CASE_DELETE: 'case:delete',
  /** 推进办件阶段（处理办件） */
  CASE_PROCESS: 'case:process'
});

/**
 * 角色 → 权限码映射。
 * 修改授权规则只改这里，数据库里的 permissions 字段仅用于临时追加单项权限。
 */
const ROLE_PERMISSIONS = Object.freeze({
  [ROLE.ADMIN]: [ALL_PERMISSIONS],
  [ROLE.MANAGER]: [
    PERMISSIONS.CASE_VIEW,
    PERMISSIONS.CASE_CREATE,
    PERMISSIONS.CASE_UPDATE,
    PERMISSIONS.CASE_DELETE,
    PERMISSIONS.CASE_PROCESS
  ],
  [ROLE.OPERATOR]: [PERMISSIONS.CASE_VIEW, PERMISSIONS.CASE_CREATE],
  [ROLE.HANDLER]: [PERMISSIONS.CASE_VIEW, PERMISSIONS.CASE_PROCESS],
  [ROLE.VIEWER]: [PERMISSIONS.CASE_VIEW],
  [ROLE.COMMON]: []
});

/**
 * 校验角色码是否合法。
 * @param {string} role 角色码
 * @returns {boolean} 是否合法
 */
function isValidRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role);
}

/**
 * 把逗号分隔的角色/权限字符串转成数组（去空、去重）。
 * @param {string|Array<string>|null} value 原始值
 * @returns {Array<string>} 数组
 */
function toList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(list.map(item => String(item).trim()).filter(Boolean))];
}

/**
 * 根据角色与显式权限计算最终权限集合。
 * 管理员直接返回通配权限；其余角色取并集，再叠加数据库里显式配置的权限码。
 * @param {string|Array<string>} roles 角色码（可以是逗号分隔字符串）
 * @param {string|Array<string>} [extraPermissions] 额外授权的权限码
 * @returns {Array<string>} 权限码数组
 */
function resolvePermissions(roles, extraPermissions) {
  const roleList = toList(roles);
  if (roleList.includes(ROLE.ADMIN)) return [ALL_PERMISSIONS];

  const merged = new Set();
  roleList.forEach(role => {
    (ROLE_PERMISSIONS[role] || []).forEach(code => merged.add(code));
  });
  toList(extraPermissions).forEach(code => merged.add(code));

  return [...merged];
}

module.exports = {
  ALL_PERMISSIONS,
  ROLE,
  ROLE_LABELS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  isValidRole,
  toList,
  resolvePermissions
};
