<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import dayjs from "dayjs";
import { ElMessage, ElMessageBox } from "element-plus";
import { hasPerms } from "@/utils/auth";
import {
  getCaseList,
  deleteCase,
  type CaseRecord,
  type CaseListParams
} from "@/api/cases";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TAG_TYPES,
  getCaseActionState
} from "@/constants/case";
import { CASE_PERMISSIONS } from "@/constants/permission";
import CaseFormDialog from "@/views/cases/components/CaseFormDialog.vue";
import CaseDetailDrawer from "@/views/cases/components/CaseDetailDrawer.vue";
import CaseStageDialog from "@/views/cases/components/CaseStageDialog.vue";

defineOptions({
  name: "CaseList"
});

/** 列表数据与分页状态 */
const caseList = ref<Array<CaseRecord>>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);

/** 查询条件：与后端 POST /api/cases 的 body 一一对应 */
const filters = ref<{
  caseNo: string;
  businessName: string;
  status: number | "";
  mine: boolean;
}>({
  caseNo: "",
  businessName: "",
  status: "",
  mine: false
});

/** 新增/编辑弹窗 */
const formVisible = ref(false);
/** 详情抽屉 */
const detailVisible = ref(false);
/** 推进阶段弹窗 */
const stageVisible = ref(false);
/** 当前操作行：新增时为空对象，编辑/详情/推进时为该行记录 */
const currentCase = ref<Partial<CaseRecord>>({});
/** 详情抽屉组件引用：推进成功后需要刷新时间轴 */
const detailRef = ref<InstanceType<typeof CaseDetailDrawer>>();

/**
 * 每行可执行动作的映射：终态只能查看，已流转的不能编辑/删除。
 * 用 computed 统一算一次，避免模板里每点一次按钮都重算。
 */
const actionStates = computed(() => {
  const map: Record<string, ReturnType<typeof getCaseActionState>> = {};
  caseList.value.forEach(row => {
    map[row.caseguid] = getCaseActionState(row.status, row.maxStageNo);
  });
  return map;
});

/**
 * 时间展示统一到秒，空值显示占位符，避免表格里出现 Invalid Date。
 * @param value 后端返回的时间字符串
 */
const formatTime = (value?: string) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-");

/** 按当前条件与页码加载列表 */
const loadCases = async () => {
  loading.value = true;
  try {
    const params: CaseListParams = {
      page: page.value,
      pageSize: pageSize.value
    };
    if (filters.value.caseNo.trim()) params.caseNo = filters.value.caseNo.trim();
    if (filters.value.businessName.trim()) params.businessName = filters.value.businessName.trim();
    // status 允许为 0，这里用严格判断避免把「待受理」当成未选择
    if (filters.value.status !== "") params.status = Number(filters.value.status);
    if (filters.value.mine) params.scope = "mine";

    const res = await getCaseList(params);
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "查询办件失败");
    }
    caseList.value = res.data.list;
    total.value = res.data.total;
  } catch (error) {
    ElMessage.error(`办件列表加载失败：${(error as Error).message || "请求失败"}`);
  } finally {
    loading.value = false;
  }
};

/** 点击查询：重置到第一页，避免停留在超出范围的页码上 */
const handleSearch = () => {
  page.value = 1;
  loadCases();
};

/** 重置查询条件 */
const handleReset = () => {
  filters.value = { caseNo: "", businessName: "", status: "", mine: false };
  handleSearch();
};

/** 打开新增弹窗 */
const openCreate = () => {
  currentCase.value = {};
  formVisible.value = true;
};

/** 打开编辑弹窗 */
const openEdit = (row: CaseRecord) => {
  currentCase.value = { ...row };
  formVisible.value = true;
};

/** 打开详情抽屉 */
const openDetail = (row: CaseRecord) => {
  currentCase.value = { ...row };
  detailVisible.value = true;
};

/** 打开推进阶段弹窗（列表行与详情抽屉共用） */
const openStage = (row: Partial<CaseRecord>) => {
  currentCase.value = { ...row };
  stageVisible.value = true;
};

/** 删除办件：连阶段记录一起删除，必须二次确认 */
const handleDelete = (row: CaseRecord) => {
  ElMessageBox.confirm(
    `确认删除办件「${row.caseNo}」吗？其全部阶段记录也会一并删除。`,
    "删除确认",
    { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
  )
    .then(async () => {
      const res = await deleteCase(row.caseguid);
      if (res.code === 200) {
        ElMessage.success("删除成功");
        // 删掉当前页最后一条时回退一页，避免停在空页
        if (caseList.value.length === 1 && page.value > 1) page.value -= 1;
        loadCases();
      } else {
        ElMessage.error(`删除失败：${res.message || "请求失败"}`);
      }
    })
    .catch(() => {
      // 取消删除，无需处理
    });
};

/** 阶段推进成功后：刷新列表，详情抽屉打开时同步刷新时间轴 */
const handleStageSuccess = () => {
  loadCases();
  if (detailVisible.value) detailRef.value?.reload();
};

onMounted(loadCases);
</script>

<template>
  <div class="case-page">
    <div class="page-heading">
      <div>
        <h2>办件管理</h2>
        <p>受理、流转与查阅办件，按角色控制可执行的操作</p>
      </div>
      <div>
        <el-button :loading="loading" @click="loadCases">刷新列表</el-button>
        <el-button v-if="hasPerms(CASE_PERMISSIONS.CREATE)" type="primary" @click="openCreate">
          新增办件
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="case-card">
      <el-form :inline="true" class="filter-form" @submit.prevent>
        <el-form-item label="办件编号">
          <el-input v-model="filters.caseNo" clearable placeholder="支持模糊查询" class="filter-input" />
        </el-form-item>
        <el-form-item label="业务名称">
          <el-input v-model="filters.businessName" clearable placeholder="支持模糊查询" class="filter-input" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" class="filter-select">
            <el-option
              v-for="(label, value) in CASE_STATUS_LABELS"
              :key="value"
              :label="label"
              :value="Number(value)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="只看我的">
          <el-switch v-model="filters.mine" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="caseList" stripe>
        <el-table-column prop="caseNo" label="办件编号" width="160" />
        <el-table-column prop="businessName" label="业务名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="applicantName" label="申请人" width="110" />
        <el-table-column label="办理部门" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.deptName || "-" }}</template>
        </el-table-column>
        <el-table-column label="办理人" width="120">
          <template #default="{ row }">{{ row.handlerName || "-" }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="CASE_STATUS_TAG_TYPES[row.status]" size="small">
              {{ CASE_STATUS_LABELS[row.status] || "未知" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="170">
          <template #default="{ row }">{{ formatTime(row.applyTime) }}</template>
        </el-table-column>
        <el-table-column label="办结时间" width="170">
          <template #default="{ row }">{{ formatTime(row.finishTime) }}</template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="240" align="center">
          <template #default="{ row }">
            <el-button type="success" size="small" link @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="hasPerms(CASE_PERMISSIONS.PROCESS)"
              type="primary"
              size="small"
              link
              :disabled="!actionStates[row.caseguid]?.processable"
              :title="actionStates[row.caseguid]?.processable ? '' : '办件已结束，不能再推进阶段'"
              @click="openStage(row)"
            >
              推进
            </el-button>
            <el-button
              v-if="hasPerms(CASE_PERMISSIONS.UPDATE)"
              type="primary"
              size="small"
              link
              :disabled="!actionStates[row.caseguid]?.editable"
              :title="actionStates[row.caseguid]?.reason"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="hasPerms(CASE_PERMISSIONS.DELETE)"
              type="danger"
              size="small"
              link
              :disabled="!actionStates[row.caseguid]?.editable"
              :title="actionStates[row.caseguid]?.reason"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无办件数据" :image-size="80" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="loadCases"
          @size-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑办件 -->
    <case-form-dialog v-model:visible="formVisible" v-model:case-record="currentCase" @refresh="loadCases" />
    <!-- 办件详情（含阶段时间轴） -->
    <case-detail-drawer
      ref="detailRef"
      v-model:visible="detailVisible"
      :case-guid="currentCase.caseguid"
      @advance="openStage"
    />
    <!-- 推进阶段 -->
    <case-stage-dialog
      v-model:visible="stageVisible"
      v-model:case-record="currentCase"
      @refresh="handleStageSuccess"
    />
  </div>
</template>

<style scoped>
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

.case-card {
  border-radius: 10px;
}

.filter-form {
  margin-bottom: 4px;
}

.filter-input {
  width: 200px;
}

.filter-select {
  width: 140px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }

  .filter-input,
  .filter-select {
    width: 100%;
  }
}
</style>
