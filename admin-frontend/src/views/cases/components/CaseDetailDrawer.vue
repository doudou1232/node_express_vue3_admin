<script setup lang="ts">
import { ref, watch } from "vue";
import dayjs from "dayjs";
import { ElMessage } from "element-plus";
import { hasPerms } from "@/utils/auth";
import { getCaseDetail, type CaseDetail } from "@/api/cases";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TAG_TYPES,
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TAG_TYPES,
  getCaseActionState
} from "@/constants/case";
import { CASE_PERMISSIONS } from "@/constants/permission";
import { computed } from "vue";

defineOptions({
  name: "CaseDetailDrawer"
});

const visible = defineModel<boolean>("visible", { default: false });
const props = defineProps<{ caseGuid?: string }>();
const emit = defineEmits<{ advance: [detail: CaseDetail] }>();

const loading = ref(false);
const detail = ref<CaseDetail | null>(null);

/** 当前办件允许的动作：终态只能查看，推进按钮同步置灰 */
const actionState = computed(() =>
  detail.value
    ? getCaseActionState(detail.value.status, detail.value.maxStageNo)
    : { editable: false, processable: false, reason: "" }
);

/**
 * 时间轴节点类型：已完成显示成功色，进行中显示主色，其余中性。
 * @param status 阶段状态
 */
const timelineType = (status: number) => {
  if (status === 3) return "success";
  if (status === 2) return "primary";
  if (status === 4) return "danger";
  return "info";
};

/** 统一时间展示，空值显示占位符 */
const formatTime = (value?: string) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-");

/** 拉取详情：主表与阶段时间轴由接口一次返回 */
const loadDetail = async () => {
  if (!props.caseGuid) return;
  loading.value = true;
  try {
    const res = await getCaseDetail(props.caseGuid);
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "查询办件详情失败");
    }
    detail.value = res.data;
  } catch (error) {
    ElMessage.error((error as Error).message || "查询办件详情失败");
  } finally {
    loading.value = false;
  }
};

// 打开时按当前 caseguid 加载，关闭时清空，避免下次打开闪现上一条数据
watch(visible, newVal => {
  if (newVal) {
    detail.value = null;
    loadDetail();
  }
});

// 父级切换办件（抽屉保持打开）时重新加载
watch(
  () => props.caseGuid,
  () => {
    if (visible.value) loadDetail();
  }
);

// 阶段推进成功后由父级调用，刷新时间轴
defineExpose({ reload: loadDetail });
</script>

<template>
  <el-drawer v-model="visible" title="办件详情" size="560px">
    <div v-loading="loading" class="detail-body">
      <template v-if="detail">
        <div class="detail-head">
          <span class="case-no">{{ detail.caseNo }}</span>
          <el-tag :type="CASE_STATUS_TAG_TYPES[detail.status]" size="small">
            {{ CASE_STATUS_LABELS[detail.status] || "未知" }}
          </el-tag>
        </div>

        <el-descriptions :column="2" border size="small" class="detail-info">
          <el-descriptions-item label="业务名称" :span="2">
            {{ detail.businessName }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">{{ detail.applicantName }}</el-descriptions-item>
          <el-descriptions-item label="办理部门">{{ detail.deptName || "-" }}</el-descriptions-item>
          <el-descriptions-item label="办理人">{{ detail.handlerName || "-" }}</el-descriptions-item>
          <el-descriptions-item label="咨询电话">{{ detail.consultPhone || "-" }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ formatTime(detail.applyTime) }}</el-descriptions-item>
          <el-descriptions-item label="办结时间">{{ formatTime(detail.finishTime) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detail.remark || "-" }}</el-descriptions-item>
        </el-descriptions>

        <div class="stage-head">
          <span>办理进度</span>
          <el-button
            v-if="hasPerms(CASE_PERMISSIONS.PROCESS)"
            type="primary"
            size="small"
            :disabled="!actionState.processable"
            :title="actionState.processable ? '' : '办件已结束，不能再推进阶段'"
            @click="emit('advance', detail)"
          >
            推进阶段
          </el-button>
        </div>

        <el-timeline v-if="detail.stages.length" class="stage-timeline">
          <el-timeline-item
            v-for="stage in detail.stages"
            :key="stage.sortNo"
            :timestamp="formatTime(stage.startTime)"
            :type="timelineType(stage.status)"
            placement="top"
          >
            <div class="stage-card">
              <div class="stage-title">
                <span>{{ stage.stageName }}</span>
                <el-tag :type="STAGE_STATUS_TAG_TYPES[stage.status]" size="small">
                  {{ STAGE_STATUS_LABELS[stage.status] || "未知" }}
                </el-tag>
              </div>
              <p class="stage-meta">
                办理人：{{ stage.handlerName || "-" }}　部门：{{ stage.deptName || "-" }}
              </p>
              <p v-if="stage.endTime" class="stage-meta">完成于 {{ formatTime(stage.endTime) }}</p>
              <p v-if="stage.opinion" class="stage-opinion">{{ stage.opinion }}</p>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无阶段记录" :image-size="70" />
      </template>
      <el-empty v-else-if="!loading" description="未获取到办件详情" :image-size="80" />
    </div>
  </el-drawer>
</template>

<style scoped>
.detail-body {
  min-height: 200px;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.case-no {
  color: var(--el-text-color-primary);
  font-weight: 600;
  font-size: 16px;
}

.detail-info {
  margin-bottom: 24px;
}

.stage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.stage-timeline {
  padding-left: 4px;
}

.stage-card {
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.stage-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-weight: 600;
}

.stage-meta {
  margin: 2px 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.stage-opinion {
  margin: 6px 0 0;
  color: var(--el-text-color-regular);
  font-size: 13px;
  white-space: pre-wrap;
}
</style>
