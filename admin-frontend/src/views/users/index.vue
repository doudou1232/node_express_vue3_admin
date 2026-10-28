<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { useUsersStore } from "@/store/modules/users";

defineOptions({
  name: "UserList"
});

const usersStore = useUsersStore();
const { users, loading } = storeToRefs(usersStore);
const keyword = ref("");

const filteredUsers = computed(() => {
  const value = keyword.value.trim().toLowerCase();

  if (!value) {
    return users.value;
  }

  return users.value.filter(user => {
    return [user.username, user.phone ?? ""].some(field =>
      field.toLowerCase().includes(value)
    );
  });
});

function formatGender(gender: number) {
  if (gender === 1) return "男";
  if (gender === 2) return "女";
  return "未知";
}

function formatStatus(status: number) {
  return status === 1 ? "正常" : "停用";
}
// 加载用户
async function loadUsers() {
  try {
    await usersStore.fetchUsers();
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求失败";
    ElMessage.error(`用户列表加载失败：${message}`);
  }
}
// 新增用户
const addUser = () => {
  // 跳转到新增用户页面
  console.log("跳转到新增用户页面");
};

onMounted(loadUsers);
</script>

<template>
  <div class="user-page">
    <div class="page-heading">
      <div>
        <h2>用户管理</h2>
        <p>查看当前系统中的人员信息</p>
      </div>
      <div>
        <el-button type="primary" :loading="loading" @click="loadUsers">
          刷新列表
        </el-button>
        <el-button type="primary" @click="addUser"> 新增用户 </el-button>
      </div>
    </div>

    <el-card shadow="never" class="user-card">
      <div class="toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索用户名或手机号" class="search-input" />
        <span class="result-count">共 {{ filteredUsers.length }} 人</span>
      </div>

      <el-table v-loading="loading" :data="filteredUsers" stripe>
        <el-table-column prop="id" label="ID" width="90" />
        <el-table-column prop="username" label="用户名" min-width="160" />
        <el-table-column prop="phone" label="手机号" min-width="160">
          <template #default="{ row }">
            {{ row.phone || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="性别" width="100">
          <template #default="{ row }">
            {{ formatGender(row.gender) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="创建时间" min-width="190" />
      </el-table>
    </el-card>
    <!-- 新增和编辑弹窗 -->
  </div>
</template>

<style scoped>
.user-page {
  /* padding: 24px; */
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-heading h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 22px;
}

.page-heading p {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
}

.user-card {
  border-radius: 10px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.search-input {
  width: 280px;
}

.result-count {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

@media (max-width: 768px) {
  .user-page {
    padding: 16px;
  }

  .page-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }

  .search-input {
    width: 100%;
  }
}
</style>
