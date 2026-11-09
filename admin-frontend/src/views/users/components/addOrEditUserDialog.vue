<script setup lang="ts">
import { ref, defineEmits, watch } from 'vue'
import { addUser, updateUserByUserId, UserRecord } from '@/api/users'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

defineOptions({
  name: "AddOrEditUserDialog"
});
const emit = defineEmits(['refreshData'])
const visible = defineModel<boolean>('visible', {
  default: false
})
// 新增时为空对象、编辑时为完整记录，故用 Partial 描述两种形态
const detailUser = defineModel<Partial<UserRecord>>('detail-user', {
  default: () => ({})
})
// 提交loading状态
const loading = ref<boolean>(false)
// 表单数据：打开即空表单，新增重置为 {}、编辑回填 detailUser
const userForm = ref<Partial<UserRecord>>({})
// 表单实例引用，供提交时调用 validate/resetFields
const ruleFormRef = ref<FormInstance>()
// 表单验证规则：静态配置用普通对象即可；纯格式校验用 pattern 声明式写法
const rules: FormRules<Partial<UserRecord>> = {
  username: [{ required: true, message: '请输入用户名', trigger: ['blur', 'change'] }],
  phone: [
    { required: true, message: '请输入手机号', trigger: ['blur', 'change'] },
    { pattern: /^1[3456789]\d{9}$/, message: '请输入正确的手机号', trigger: ['blur', 'change'] }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: ['blur', 'change'] },
    { pattern: /^[\w.-]+@[\w-]+(\.[\w-]+)+$/, message: '请输入正确的邮箱', trigger: ['blur', 'change'] }
  ],
  gender: [{ required: true, message: '请选择性别', trigger: ['blur', 'change'] }],
  status: [{ required: true, message: '请选择启用状态', trigger: ['blur', 'change'] }]
}
watch(() => visible.value, (newVal) => {
  if (newVal) {
    // 弹窗打开时，清空表单数据
    userForm.value = {}
    userForm.value = { ...detailUser.value }
    console.log(userForm.value)
    ruleFormRef.value?.clearValidate()
  }
})
const submitForm = async () => {
  // Element Plus 的 validate 校验失败时是 reject，需接住避免未捕获异常（表单已显示红字）
  try {
    await ruleFormRef.value?.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    // 校验通过，提交表单数据
    const res = detailUser.value.userid ? await updateUserByUserId(userForm.value as UserRecord) : await addUser(userForm.value)
    // 后端 HTTP 层统一 200，业务成败由 code 区分
    if (res.code === 200) {
      visible.value = false
      // 提交成功后，清空表单数据
      userForm.value = {}
      ElMessage({
        message: detailUser.value.userid ? '更新用户成功' : '添加用户成功',
        type: 'success',
      })
      // 提交成功后，刷新父组件数据
      emit('refreshData')
    } else {
      ElMessage({
        message: res.message || (detailUser.value.userid ? '更新用户失败' : '添加用户失败'),
        type: 'error',
      })
    }
  } catch (error) {
    // 走到这里的只剩网络层错误（超时、断网），后端业务错误都在上面 else 分支
    ElMessage({
      message: (error as Error).message || (detailUser.value.userid ? '更新用户失败' : '添加用户失败'),
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <el-dialog v-model="visible" title="新增/编辑用户" width="50%">
      <el-form :model="userForm" label-width="auto" :rules="rules" ref="ruleFormRef">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="userForm.gender">
            <el-radio label="1">男</el-radio>
            <el-radio label="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="启用状态" prop="status">
          <el-radio-group v-model="userForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="loading">
            确认提交
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped></style>
