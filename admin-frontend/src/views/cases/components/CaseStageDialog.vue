<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { addCaseStage, type CaseRecord } from "@/api/cases";
import { CASE_STATUS, CASE_STATUS_LABELS } from "@/constants/case";
import { useUserStoreHook } from "@/store/modules/user";

defineOptions({
  name: "CaseStageDialog"
});

const emit = defineEmits<{ refresh: [] }>();
const visible = defineModel<boolean>("visible", { default: false });
const caseRecord = defineModel<Partial<CaseRecord>>("case-record", {
  default: () => ({})
});

/** 常用阶段名称，允许输入自定义名称 */
const STAGE_PRESETS = ["受理", "审核", "办结"];

type StageForm = {
  stageName: string;
  handlerName: string;
  deptName: string;
  opinion: string;
  caseStatus: number;
};

const loading = ref(false);
const ruleFormRef = ref<FormInstance>();
const form = ref<StageForm>({ ...createEmptyForm() });

/** 默认值：办理人取当前登录人，办理部门沿用办件主表，状态默认「办理中」 */
function createEmptyForm(): StageForm {
  return {
    stageName: "",
    handlerName: useUserStoreHook().nickname || "",
    deptName: "",
    opinion: "",
    // 默认推进到「办理中」，办结需要在状态下拉里显式选择
    caseStatus: CASE_STATUS.PROCESSING
  };
}

const rules: FormRules<StageForm> = {
  stageName: [{ required: true, message: "请填写阶段名称", trigger: ["blur", "change"] }],
  caseStatus: [{ required: true, message: "请选择推进后的办件状态", trigger: "change" }]
};

// 打开时重置表单，并带上当前办件的部门与办理人，减少重复输入
watch(visible, newVal => {
  if (!newVal) return;
  ruleFormRef.value?.clearValidate();
  form.value = {
    ...createEmptyForm(),
    deptName: caseRecord.value.deptName ?? "",
    handlerName: useUserStoreHook().nickname || caseRecord.value.handlerName || ""
  };
});

/** 提交推进：后端会在事务里结束当前阶段、追加新阶段并同步主表状态 */
const submitForm = async () => {
  if (!caseRecord.value.caseguid) {
    ElMessage.error("缺少办件标识，无法推进");
    return;
  }
  try {
    await ruleFormRef.value?.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    const res = await addCaseStage(caseRecord.value.caseguid, {
      stageName: form.value.stageName.trim(),
      handlerName: form.value.handlerName.trim() || null,
      deptName: form.value.deptName.trim() || null,
      opinion: form.value.opinion.trim() || null,
      caseStatus: form.value.caseStatus
    });

    if (res.code === 200) {
      ElMessage.success(
        form.value.caseStatus === CASE_STATUS.FINISHED ? "办件已办结" : "阶段推进成功"
      );
      visible.value = false;
      emit("refresh");
    } else {
      ElMessage.error(res.message || "阶段推进失败");
    }
  } catch (error) {
    ElMessage.error((error as Error).message || "阶段推进失败");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <el-dialog v-model="visible" title="推进办理阶段" width="560px">
    <el-form ref="ruleFormRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="办件编号">
        <span class="case-no">{{ caseRecord.caseNo || "-" }}</span>
      </el-form-item>
      <el-form-item label="阶段名称" prop="stageName">
        <el-select
          v-model="form.stageName"
          filterable
          allow-create
          default-first-option
          placeholder="选择或输入阶段名称"
          class="full-width"
        >
          <el-option v-for="item in STAGE_PRESETS" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="办理人">
        <el-input v-model="form.handlerName" maxlength="50" placeholder="默认当前登录人" />
      </el-form-item>
      <el-form-item label="办理部门">
        <el-input v-model="form.deptName" maxlength="100" />
      </el-form-item>
      <el-form-item label="办理意见">
        <el-input v-model="form.opinion" type="textarea" :rows="3" maxlength="500" show-word-limit />
      </el-form-item>
      <el-form-item label="推进后状态" prop="caseStatus">
        <el-select v-model="form.caseStatus" class="full-width">
          <el-option
            v-for="(label, value) in CASE_STATUS_LABELS"
            :key="value"
            :label="label"
            :value="Number(value)"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submitForm">确认推进</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.full-width {
  width: 100%;
}

.case-no {
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
}
</style>
