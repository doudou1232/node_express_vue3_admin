<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { UserRecord } from "@/api/users";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { useUsersStore } from "@/store/modules/users";
import UserDetailDialog from "@/views/users/components/UserDetailDialog.vue";
defineOptions({
  name: "UserList"
});
const usersStore = useUsersStore();
const { users, loading } = storeToRefs(usersStore);
// 详情弹窗是否可见
const detailVisible = ref(false);
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
  return gender == 1 ? "男" : gender == 2 ? "女" : "未知";
}

function formatStatus(status: number) {
  return status === 1 ? "正常" : "停用";
}
// 加载用户（loading 由 store 管理，页面只负责错误反馈）
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
const detailUser = ref<UserRecord>();
// 显示用户详情
const showDetail = async (user: UserRecord) => {
  detailUser.value = user;
  detailVisible.value = true;
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
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索用户名"
          class="search-input"
        />
        <span class="result-count">共 {{ filteredUsers.length }} 人</span>
      </div>

      <el-table v-loading="loading" :data="filteredUsers" stripe>
        <el-table-column prop="id" label="ID" width="90" />
        <el-table-column prop="username" label="用户名" min-width="160" />
        <el-table-column prop="phone" label="手机号">
          <template #default="{ row }">
            {{ row.phone || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" />
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
        <el-table-column prop="create_time" label="创建时间">
          <template #default="{ row }">
            {{ $dayjs(row.create_time).format("YYYY-MM-DD HH:mm:ss") }}
          </template>
        </el-table-column>
        <el-table-column prop="update_time" label="更新时间">
          <template #default="{ row }">
            {{ $dayjs(row.update_time).format("YYYY-MM-DD HH:mm:ss") }}
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" link>编辑</el-button>
            <el-button type="danger" size="small" link>删除</el-button>
            <el-button
              type="success"
              size="small"
              link
              @click="showDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <!-- 新增和编辑弹窗 -->
    <user-detail-dialog
      v-model:visible="detailVisible"
      v-model:detail-user="detailUser"
    />
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
