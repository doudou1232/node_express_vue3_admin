const express = require('express');
const {
  addCase,
  getCaseByGuid,
  updateCase,
  deleteCase,
  getCaseList,
  addCaseStage
} = require('@/controllers/case.controller');
const { requirePerms } = require('@/middlewares/auth.middleware');
const { PERMISSIONS } = require('@/constants/permission');

const router = express.Router();

// 新增办件：办件编号与 caseguid 均由服务端生成，申请人未传时回落为当前登录人
router.post('/add', requirePerms(PERMISSIONS.CASE_CREATE), addCase);

// 办件列表：条件放 body，支持 userid / caseNo / businessName / status / scope + 分页
router.post('/', requirePerms(PERMISSIONS.CASE_VIEW), getCaseList);

// 更新办件：标识取 body.caseguid，与用户模块的 /update 风格一致
router.post('/update', requirePerms(PERMISSIONS.CASE_UPDATE), updateCase);

// 删除办件：同时删除其全部阶段
router.post('/delete', requirePerms(PERMISSIONS.CASE_DELETE), deleteCase);

// 推进阶段：caseguid 走路径参数，便于按资源层级理解
router.post('/:caseguid/stage', requirePerms(PERMISSIONS.CASE_PROCESS), addCaseStage);

// 办件详情：一次返回主表与阶段时间轴，减少前端请求次数
router.get('/:caseguid', requirePerms(PERMISSIONS.CASE_VIEW), getCaseByGuid);

module.exports = router;
