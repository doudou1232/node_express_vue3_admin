<script setup lang="ts">
import { ref, watch } from "vue";
import dayjs from "dayjs";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { addCase, updateCase, type CaseRecord } from "@/api/cases";
import { getUserOptions, type UserOption } from "@/api/users";
import { useUserStoreHook } from "@/store/modules/user";

defineOptions({
  name: "CaseFormDialog"
});

const emit = defineEmits<{ refresh: [] }>();
const visible = defineModel<boolean>("visible", { default: false });

/** 父级传入的记录：为空表示新增，含 caseguid 表示编辑 */
const caseRecord = defineModel<Partial<CaseRecord>>("case-record", {
  default: () => ({})
});

/** 表单数据（提交给后端的字段），编辑时保留 status / finishTime 以适应全量更新语义 */
type CaseForm = {
  caseguid?: string;
  userid: string;
  businessName: string;
  deptName: string;
  consultPhone: string;
  handlerName: string;
  applyTime: string;
  status: number;
  finishTime: string;
  remark: string;
};

const loading = ref(false);
const ruleFormRef = ref<FormInstance>();
const form = ref<CaseForm>(createEmptyForm());
/** 申请人 / 办理人下拉选项，只含 userid 与姓名 */
const userOptions = ref<Array<UserOption>>([]);

/** 新增时的默认值：申请人默认当前登录人，申请时间默认当前时间 */
function createEmptyForm(): CaseForm {
  const userStore = useUserStoreHook();
  return {
    userid: "",
    businessName: "",
    deptName: "",
    consultPhone: "",
    handlerName: userStore.nickname || "",
    applyTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    status: 1,
    finishTime: "",
    remark: ""
  };
}

const rules: FormRules<CaseForm> = {
  userid: [{ required: true, message: "请选择申请人", trigger: "change" }],
  businessName: [{ required: true, message: "请输入业务名称", trigger: ["blur", "change"] }],
  consultPhone: [
    { pattern: /^[\d-]{7,20}$/, message: "请输入正确的联系电话", trigger: "blur" }
  ]
};

/** 是否编辑态：有 caseguid 即编辑 */
const isEdit = ref(false);

/**
 * 拉取人员选项用于下拉选择。
 * 失败时只提示不阻塞，用户可以先用当前登录人创建办件。
 */
const loadUserOptions = async () => {
  try {
    const res = await getUserOptions();
    userOptions.value = res.code === 200 && res.data ? res.data : [];
  } catch (error) {
    ElMessage.warning(`人员列表加载失败：${(error as Error).message || "请求失败"}`);
  }
};

// 每次打开：新增清空表单、编辑回填全部字段（后端 update 是全量覆盖）
watch(visible, async newVal => {
  if (!newVal) return;
  ruleFormRef.value?.clearValidate();
  isEdit.value = Boolean(caseRecord.value.caseguid);

  if (isEdit.value) {
    form.value = {
      caseguid: caseRecord.value.caseguid,
      userid: caseRecord.value.userid ?? "",
      businessName: caseRecord.value.businessName ?? "",
      deptName: caseRecord.value.deptName ?? "",
      consultPhone: caseRecord.value.consultPhone ?? "",
      handlerName: caseRecord.value.handlerName ?? "",
      applyTime: caseRecord.value.applyTime ?? "",
      status: caseRecord.value.status ?? 1,
      finishTime: caseRecord.value.finishTime ?? "",
      remark: caseRecord.value.remark ?? ""
    };
  } else {
    form.value = createEmptyForm();
    // 新增时默认把当前登录人作为申请人，减少一次选择
    form.value.userid = useUserStoreHook().userid ?? "";
  }

  if (userOptions.value.length === 0) await loadUserOptions();
});

/** 提交表单：新增走 add，编辑走 update（带完整字段） */
const submitForm = async () => {
  try {
    await ruleFormRef.value?.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    const payload = {
      userid: form.value.userid,
      businessName: form.value.businessName.trim(),
      deptName: form.value.deptName.trim() || null,
      consultPhone: form.value.consultPhone.trim() || null,
      handlerName: form.value.handlerName.trim() || null,
      applyTime: form.value.applyTime || null,
      remark: form.value.remark.trim() || null
    };

    const res =
      isEdit.value && form.value.caseguid
        ? await updateCase({
            ...payload,
            caseguid: form.value.caseguid,
            status: form.value.status,
            finishTime: form.value.finishTime || null
          })
        : await addCase(payload);

    if (res.code === 200) {
      ElMessage.success(isEdit.value ? "办件更新成功" : "办件创建成功");
      visible.value = false;
      emit("refresh");
    } else {
      ElMessage.error(res.message || (isEdit.value ? "更新失败" : "创建失败"));
    }
  } catch (error) {
    ElMessage.error((error as Error).message || "提交失败");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <el-dialog v-model="visible" :title="isEdit ? '编辑办件' : '新增办件'" width="640px">
    <el-form ref="ruleFormRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="申请人" prop="userid">
        <el-select v-model="form.userid" filterable placeholder="请选择申请人" class="full-width">
          <el-option
            v-for="item in userOptions"
            :key="item.userid"
            :label="item.realName || item.username"
            :value="item.userid"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="业务名称" prop="businessName">
        <el-input v-model="form.businessName" maxlength="200" show-word-limit />
      </el-form-item>
      <el-form-item label="办理部门">
        <el-input v-model="form.deptName" maxlength="100" placeholder="如：市场监督管理局" />
      </el-form-item>
      <el-form-item label="咨询电话" prop="consultPhone">
        <el-input v-model="form.consultPhone" maxlength="30" placeholder="数字与短横线，7-20 位" />
      </el-form-item>
      <el-form-item label="办理人">
        <el-input v-model="form.handlerName" maxlength="50" placeholder="默认当前登录人" />
      </el-form-item>
      <el-form-item label="申请时间">
        <el-date-picker
          v-model="form.applyTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="留空则取服务器当前时间"
          class="full-width"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submitForm">确认提交</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.full-width {
  width: 100%;
}
</style>
