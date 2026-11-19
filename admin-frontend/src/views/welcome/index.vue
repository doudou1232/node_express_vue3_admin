<script setup lang="ts">
import { Line, Pie } from '@antv/g2plot';
import { onMounted, ref } from 'vue';
import { useTransition } from '@vueuse/core'
import { ElMessage } from "element-plus";
import { getEnterpriseRankList, type EnterpriseRankRecord } from '@/api/enterprise';
defineOptions({
  name: "Welcome"
});
interface StatisticsType {
  statisticType: string,
  statisticName: string,
  statisticNum: number,
  statisticUnit: string,
}
interface IndustryRevenueType {
  industryName: string,
  industryNum: number,
}
interface CompanyType {
  rank: number,
  nameCn: string,
  nameEn: string,
  business: string,
  country: string,
  sector: string,
  marketCapUsdBn: number,
  revenueFy2025UsdBn: number,
  revenueIsEstimate: boolean,
  leader: string,
  leaderTitle: string,
}
const industryList = ref<IndustryRevenueType[]>([{
  industryName: '零售与电商',
  industryNum: 31.1,
},
{
  industryName: '金融服务',
  industryNum: 18.11,
},
{
  industryName: '建筑与基础设施',
  industryNum: 13.57,
},
{
  industryName: '医疗与健康',
  industryNum: 13.31,
},
{
  industryName: '物流与运输',
  industryNum: 9.98,
},
{
  industryName: '石油天然气能源',
  industryNum: 7.75,
},
{
  industryName: '食品饮料',
  industryNum: 9.66,
},
{
  industryName: 'ICT 信息技术与通信',
  industryNum: 5.26,
},
{
  industryName: '其他',
  industryNum: 13.2,
},
])
// 各行业收入合计，用于把原始数值换算成占比
const totalIndustryRevenue = industryList.value.reduce(
  (sum, item) => sum + item.industryNum,
  0
);
const statisticsList = ref<StatisticsType[]>([{
  statisticType: 'gdp',
  statisticName: 'GDP',
  statisticNum: 305293,
  statisticUnit: '亿美元',
},
{
  statisticType: 'country',
  statisticName: '国家',
  statisticNum: 20,
  statisticUnit: '个',
},
{
  statisticType: 'industry',
  statisticName: '行业',
  statisticNum: 223,
  statisticUnit: '个',
},
{
  statisticType: 'company',
  statisticName: '公司',
  statisticNum: 2923,
  statisticUnit: '个',
},
])
const companies = ref<CompanyType[]>([]);
// 企业排名列表的加载状态，供表格展示加载遮罩
const loading = ref(false);
// 全球百强企业数据
// 每个统计项独立的动画源值；挂载后再赋目标值，数值才会从 0 滚动到实际值
const animatedValues = statisticsList.value.map(item => {
  const source = ref(0);
  const value = useTransition(source, {
    duration: 1500,
  });
  source.value = item.statisticNum;
  return value;
});
onMounted(() => {
  renderContainerChart();
  renderPieChart();
  renderTop100CompanyChart();
});
const renderContainerChart = async () => {
  const container = document.getElementById('container') as HTMLElement
  fetch('https://gw.alipayobjects.com/os/bmw-prod/e00d52f4-2fa6-47ee-a0d7-105dd95bde20.json')
    .then((res) => res.json())
    .then((data) => {
      const linePlot = new Line(container, {
        data,
        xField: 'year',
        yField: 'gdp',
        seriesField: 'name',
        yAxis: {
          label: {
            formatter: (v: any) => `${(v / 10e8).toFixed(1)} B`,
          },
        },
        legend: {
          position: 'top',
        },
        smooth: true,
        // 配置折线趋势填充
        area: {
          style: {
            fillOpacity: 0.15,
          },
        },
        animation: {
          appear: {
            animation: 'wave-in',
            duration: 3000,
          },
        },
      });

      linePlot.render();
    });
}
const renderPieChart = async () => {
  const piePlot = new Pie('pieContainer', {
    appendPadding: 10,
    data: industryList.value,
    angleField: 'industryNum',
    colorField: 'industryName',
    radius: 1,
    innerRadius: 0.6,
    label: {
      type: 'inner',
      offset: '-50%',
      // 用收入值 / 合计换算占比，数据本身未归一化到 100
      content: (item: any) =>
        `${((item.industryNum / totalIndustryRevenue) * 100).toFixed(1)}%`,
      style: {
        textAlign: 'center',
        fontSize: 14,
      },
    },
    tooltip: {
      formatter: (item: any) => ({
        name: item.industryName,
        value: `${item.industryNum} 万亿美元`
      })
    },
    interactions: [{ type: 'element-selected' }, { type: 'element-active' }],
    statistic: {
      title: false,
      content: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: '16',
        },
        content: '全球行业收入占比',
      },
    },
  });

  piePlot.render();

}
// 后端返回数据库原始字段（snake_case、金额为字符串），统一转换成本页使用的结构
const mapRankRecord = (record: EnterpriseRankRecord): CompanyType => ({
  rank: Number(record.rank_no),
  nameCn: record.name_cn,
  nameEn: record.name_en,
  business: record.business,
  country: record.country,
  sector: record.sector,
  marketCapUsdBn: Number(record.market_cap_usd_bn),
  revenueFy2025UsdBn: Number(record.revenue_fy2025_usd_bn),
  revenueIsEstimate: Boolean(Number(record.revenue_is_estimate)),
  leader: record.leader,
  leaderTitle: record.leader_title,
})
// 金额统一保留两位小数并加千分位，等宽数字排列时位数能对齐
const formatUsdBn = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '-';
const renderTop100CompanyChart = async () => {
  loading.value = true;
  try {
    const res = await getEnterpriseRankList();
    if (res.code !== 200 || !Array.isArray(res.data)) {
      throw new Error(res.message || '获取企业排名列表失败');
    }
    // 排名列表按名次升序展示，避免依赖数据库默认返回顺序
    companies.value = res.data
      .map(mapRankRecord)
      .sort((a, b) => a.rank - b.rank);
  } catch (error) {
    ElMessage.error((error as Error).message || '获取企业排名列表失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <!-- 数据统计部分 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据统计</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col v-for="(item, index) in statisticsList" :key="item.statisticType" :span="6">
          <div class="card-content">
            <span>
              <el-statistic :title="item.statisticName" :value="animatedValues[index].value" />
            </span>
          </div>
        </el-col>
      </el-row>
    </el-card>
    <!-- 图表部分 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>全球GDP趋势图</span>
            </div>
          </template>
          <div id="container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>全球行业收入占比</span>
            </div>
          </template>
          <div id="pieContainer"></div>
        </el-card>
      </el-col>
    </el-row>
    <!-- 全球百强企业展示 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>全球百强企业</span>
        </div>
      </template>
      <div v-loading="loading" class="auto-table">
        <!-- 表头：在滚动区之外，天然固定 -->
        <div class="auto-table__head">
          <span>排名</span>
          <span>企业名称</span>
          <span>英文名称</span>
          <span>行业</span>
          <span>国家</span>
          <span class="col-num">市值（十亿美元）</span>
          <span class="col-num">2025年收入（十亿美元）</span>
          <span>负责人</span>
        </div>
        <!-- 组件 inheritAttrs:false，class 不会透传，必须自己包一层承载高度 -->
        <div class="auto-table__body">
          <!-- 组件只在挂载时且 list 非空才初始化，数据异步返回，需等就绪后再渲染 -->
          <seamless-scroll
            v-if="companies.length"
            :list="companies"
            :step="0.3"
            :hover="true"
            :visible-count="12"
          >
            <template #default="{ data }">
              <div class="auto-table__row">
                <span>{{ data.rank }}</span>
                <span :title="data.business">{{ data.nameCn }}</span>
                <span>{{ data.nameEn }}</span>
                <span>{{ data.sector }}</span>
                <span>{{ data.country }}</span>
                <span class="col-num">{{ formatUsdBn(data.marketCapUsdBn) }}</span>
                <span class="col-num">
                  {{ formatUsdBn(data.revenueFy2025UsdBn) }}
                  <!-- 预估值加标记，避免和已披露财报混在一起 -->
                  <sup v-if="data.revenueIsEstimate" class="col-flag" title="预估值">*</sup>
                </span>
                <span :title="data.leaderTitle">{{ data.leader }}</span>
              </div>
            </template>
          </seamless-scroll>
          <!-- 加载失败或确实没有数据时给出明确提示，而不是留一块空白 -->
          <el-empty v-else-if="!loading" description="暂无企业排名数据" :image-size="80" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
/* 表头与行共用同一套列宽：数字列固定宽度，名称列按比例分配，避免等宽导致的挤压 */
.auto-table__head,
.auto-table__row {
  display: grid;
  grid-template-columns:
    64px minmax(96px, 1.1fr) minmax(120px, 1.5fr)
    minmax(80px, 0.9fr) 72px 120px 168px minmax(120px, 1.3fr);
  column-gap: 12px;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  font-size: 14px;
  /* 长文本必须单行省略：行高被撑开会让组件对容器高度的判断失准，滚动就停了 */
  white-space: nowrap;
}

/* grid 子项默认 min-width:auto 不收缩，置 0 省略号才生效 */
.auto-table__head > span,
.auto-table__row > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 对齐 el-table 表头：主色文字、浅灰底、下边框 */
.auto-table__head {
  color: var(--el-text-color-primary);
  font-weight: 600;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
}

/* 行沿用表格正文色、分隔线与悬停高亮 */
.auto-table__row {
  color: var(--el-text-color-regular);
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s;
}

.auto-table__row:hover {
  background: var(--el-fill-color-light);
}

/* 数字右对齐 + 等宽数字，纵向对比时位数能对齐 */
.auto-table__head .col-num,
.auto-table__row .col-num {
  font-variant-numeric: tabular-nums;
  text-align: center;
}

/* 收入预估标记：弱化颜色，不抢数字本身的视觉重量 */
.auto-table__row .col-flag {
  color: var(--el-color-warning);
  font-size: 12px;
  margin-left: 2px;
}

/* 滚动容器必须有固定高度并裁掉溢出内容 */
.auto-table__body {
  height: 480px;
  overflow: hidden;
  /* 组件内部有一个 position:absolute 的测量节点，需以此为定位参照 */
  position: relative;
}
</style>
