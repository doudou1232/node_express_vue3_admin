const express = require('express');
const {
  addCase,
  getCaseByGuid,
  updateCase,
  deleteCase,
  getCaseList,
  addCaseStage
} = require('@/controllers/case.controller');

const router = express.Router();

// 新增办件：办件编号与 caseguid 均由服务端生成
router.post('/add', addCase);

// 办件列表：条件放 body，支持 userid / caseNo / businessName / status
router.post('/', getCaseList);

// 更新办件：标识取 body.caseguid，与用户模块的 /update 风格一致
router.post('/update', updateCase);

// 删除办件：同时删除其全部阶段
router.post('/delete', deleteCase);

// 推进阶段：caseguid 走路径参数，便于按资源层级理解
router.post('/:caseguid/stage', addCaseStage);

// 办件详情：一次返回主表与阶段时间轴，减少前端请求次数
router.get('/:caseguid', getCaseByGuid);

module.exports = router;
