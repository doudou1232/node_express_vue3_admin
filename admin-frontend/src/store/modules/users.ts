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
        this.loading = false;
      }
    }
  }
});
