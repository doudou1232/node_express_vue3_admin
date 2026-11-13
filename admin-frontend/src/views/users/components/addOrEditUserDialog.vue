<script setup lang="ts">
import { ref, defineEmits, watch } from 'vue'
import { addUser, updateUserByUserId, UserRecord } from '@/api/users'
import { uploadFile } from '@/api/attachment'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
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
  realName: [{ required: true, message: '请输入姓名', trigger: ['blur', 'change'] }],
  username: [
    { required: true, message: '请输入用户名', trigger: ['blur', 'change'] },
    // 用户名即登录账号，与后端校验保持一致：字母开头，仅允许字母和数字
    {
      pattern: /^[A-Za-z][A-Za-z0-9]*$/,
      message: '用户名只能使用字母（可含数字），且需以字母开头',
      trigger: ['blur', 'change']
    }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: ['blur', 'change'] },
    { pattern: /^1[3456789]\d{9}$/, message: '请输入正确的手机号', trigger: ['blur', 'change'] }
  ],
  // 密码选填：留空时新增的账号暂时无法登录、编辑时保持原密码不变
  password: [
    {
      min: 6,
      message: '密码长度不能少于 6 位',
      trigger: ['blur', 'change']
    }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: ['blur', 'change'] },
    { pattern: /^[\w.-]+@[\w-]+(\.[\w-]+)+$/, message: '请输入正确的邮箱', trigger: ['blur', 'change'] }
  ],
  gender: [{ required: true, message: '请选择性别', trigger: ['blur', 'change'] }],
  status: [{ required: true, message: '请选择启用状态', trigger: ['blur', 'change'] }]
}
// 头像上传中状态，避免用户重复点击选择
const uploading = ref<boolean>(false)
// 弹窗每次打开时重置表单：新增为空表单、编辑回填选中记录，并清掉上次的校验红字
watch(visible, (newVal) => {
  if (!newVal) {
    userForm.value = {}
    return
  }
  // 编辑时回填其他字段，但密码绝不回填，避免把旧密码明文暴露在表单里
  userForm.value = { ...detailUser.value, password: '' }
  uploading.value = false
  ruleFormRef.value?.clearValidate()
})

/**
 * 选文件后先做本地校验，减少无效请求；后端会按白名单再校验一次
 * @param file 浏览器选中的文件
 */
const beforeAvatarUpload = (file: File) => {
  const allowTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowTypes.includes(file.type)) {
    ElMessage.error('头像仅支持 jpg/png/webp 格式')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('头像大小不能超过 2MB')
    return false
  }
  return true
}

/**
 * 自定义上传：走统一 http 封装拿相对路径回填表单。
 * 这里只上传文件，写入用户表要等点击"确认提交"，避免取消时留下脏数据。
 * @param options el-upload 上传参数，含文件对象
 */
const handleAvatarUpload = async (options: UploadRequestOptions) => {
  console.log(options, 111)
  uploading.value = true
  try {
    const res = await uploadFile(options.file, 'user_avatar')
    // 业务失败也抛错，交由 el-upload 统一按失败处理
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || '头像上传失败')
    }
    userForm.value.avatar = res.data.filePath
    ElMessage.success('头像上传成功')
    return res.data
  } catch (error) {
    ElMessage.error((error as Error).message || '头像上传失败')
    // 抛出后由 el-upload 内部 onError 兜底，无需手动调用
    throw error
  } finally {
    uploading.value = false
  }
}

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
        <el-form-item label="头像">
          <!-- 自定义 http-request 走项目统一封装，先上传文件再回填相对路径 -->
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :before-upload="beforeAvatarUpload"
            :http-request="handleAvatarUpload"
            :disabled="uploading"
            accept="image/jpeg,image/png,image/webp"
          >
            <!-- 无头像时由 el-avatar 渲染内置人像图标，避免首字兜底与左侧「头像」label 视觉粘连 -->
            <el-avatar :size="72" :src="userForm.avatar || undefined" />
            <div class="avatar-tip">{{ uploading ? "上传中..." : "点击更换头像" }}</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="userForm.realName" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="登录账号，字母开头，仅字母和数字" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="detailUser.userid ? '留空则不修改密码' : '至少 6 位，留空则该账号暂不可登录'"
          />
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

<style lang="scss" scoped>
.avatar-uploader {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.avatar-tip {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
