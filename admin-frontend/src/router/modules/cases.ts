import { CASE_ROUTE_ROLES } from "@/constants/permission";

const Layout = () => import("@/layout/index.vue");

/**
 * 办件管理菜单。
 * meta.roles 控制菜单显隐与页面访问：只有被分配了办件相关角色的用户才能进入，
 * 具体按钮（新增/编辑/删除/推进）再由权限码 case:* 二次控制。
 */
export default {
  path: "/cases",
  name: "Cases",
  component: Layout,
  meta: {
    icon: "ep:document",
    title: "办件管理",
    rank: 2
  },
  children: [
    {
      path: "/cases/index",
      name: "CaseList",
      component: () => import("@/views/cases/index.vue"),
      meta: {
        title: "办件列表",
        // 父级不放 roles：子级无权限时 filterChildrenTree 会把空父级一起裁掉
        roles: CASE_ROUTE_ROLES,
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;
