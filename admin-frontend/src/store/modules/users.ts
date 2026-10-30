import { defineStore } from "pinia";
import { getUserList, type UserRecord } from "@/api/users";

export const useUsersStore = defineStore("users", {
  state: () => ({
    users: [] as UserRecord[],
    loading: false
  }),
  actions: {
    async fetchUsers() {
      this.loading = true;

      try {
        const response = await getUserList();
        this.users = response.data ?? [];
      } finally {
        // 请求结束（无论成败）后复位，保证 loading 覆盖整个请求周期
        this.loading = false;
      }
    }
  }
});
