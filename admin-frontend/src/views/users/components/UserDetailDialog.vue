<template>
  <div>
    <el-dialog
      v-model="visible"
      title="用户详情"
      width="50%"
      @close="closeDialog"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户名：">{{
          userInfo.username
        }}</el-descriptions-item>
        <el-descriptions-item label="手机号：">{{
          userInfo.phone
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
import { defineModel, defineOptions, onMounted, ref, watch } from "vue";
import { UserRecord, getUserDetailById } from "@/api/users";

defineOptions({
  name: "UserDetailDialog"
});
// 详情弹窗用户数据
const detailUser = defineModel<UserRecord>("detailUser", {
  default: () => ({})
});

// 弹窗开关：父组件通过 v-model:visible 双向控制，关闭时自动同步回父组件
const visible = defineModel<boolean>("visible", { default: false });
const userInfo = ref<UserRecord>({
  id: "",
  userid: "",
  username: "",
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
  getDetailUserById(newVal.userid);
});
const getDetailUserById = async (id: string | number) => {
  const res = await getUserDetailById(id);
  // 后端统一约定 code 200 表示成功
  if (res.code == 200) {
    userInfo.value = res.data;
  }
};
const formatGender = (gender: number) => {
  return gender == 1 ? "男" : gender == 2 ? "女" : "未知";
};
</script>

<style lang="scss" scoped></style>
