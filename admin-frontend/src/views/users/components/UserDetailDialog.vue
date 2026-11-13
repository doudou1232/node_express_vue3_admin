<template>
  <div>
    <el-dialog
      v-model="visible"
      title="用户详情"
      width="50%"
      @close="closeDialog"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="头像：" :span="2">
          <el-avatar :size="64" :src="userInfo.avatar || undefined">
            {{ (userInfo.realName || userInfo.username)?.slice(0, 1) }}
          </el-avatar>
        </el-descriptions-item>
        <el-descriptions-item label="用户名：">{{
          userInfo.username
        }}</el-descriptions-item>
        <el-descriptions-item label="姓名：">{{
          userInfo.realName ?? "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="手机号：">{{
          userInfo.phone ?? "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="邮箱：">{{
          userInfo.email
        }}</el-descriptions-item>
        <el-descriptions-item label="性别：">{{
          formatGender(userInfo.gender)
        }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from "vue";
import { UserRecord, getUserDetailById } from "@/api/users";

defineOptions({
  name: "UserDetailDialog"
});
// 详情弹窗用户数据：新增场景可能为空对象，用 Partial 描述
const detailUser = defineModel<Partial<UserRecord>>("detailUser", {
  default: () => ({})
});

// 弹窗开关：父组件通过 v-model:visible 双向控制，关闭时自动同步回父组件
const visible = defineModel<boolean>("visible", { default: false });
// 详情数据按需展示，字段可能缺失（如后端 NULL），用 Partial 避免空对象赋值报错
const userInfo = ref<Partial<UserRecord>>({
  id: "",
  userid: "",
  username: "",
  realName: "",
  phone: "",
  email: "",
  gender: 0,
  status: 0,
  create_time: "",
  update_time: ""
});
// 关闭弹窗
const closeDialog = () => {
  console.log("关闭弹窗");
  visible.value = false;
};
onMounted(() => {
  console.log("组件挂载完成");
});
// 监听 detailUser 变化，更新弹窗数据
watch(detailUser, newVal => {
  // 新增场景没有 userid，不发起详情请求
  if (newVal.userid) {
    getDetailUserById(newVal.userid);
  }
});
const getDetailUserById = async (id: string | number) => {
  const res = await getUserDetailById(id);
  // 项目约定：成功响应统一返回 code 200（严格相等，data 由下方 || 兜底）
  if (res.code === 200) {
    userInfo.value = res.data || {};
  }
};
const formatGender = (gender: number|string) => {
  return gender == 1 ? "男" : gender == 2 ? "女" : "未知";
};
</script>

<style lang="scss" scoped></style>
