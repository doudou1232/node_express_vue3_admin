const Layout = () => import("@/layout/index.vue");

export default {
  path: "/users",
  name: "Users",
  component: Layout,
  meta: {
    icon: "ep:user-filled",
    title: "用户管理",
    rank: 1
  },
  children: [
    {
      path: "/users/index",
      name: "UserList",
      component: () => import("@/views/users/index.vue"),
      meta: {
        title: "用户列表",
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;
