const express = require('express');
const {
  addUser,
  getUserById,
  updateUser,
  deleteUser,
  getUsers,
  getUserOptions
} = require('@/controllers/user.controller');
const { requirePerms } = require('@/middlewares/auth.middleware');
const { PERMISSIONS } = require('@/constants/permission');

const router = express.Router();

router.post('/add', addUser);
// 更新：控制器从 body.userid 取标识，与详情/删除保持同样的 userid 语义
router.post('/update', updateUser);
router.post('/delete', deleteUser);
// 人员选项必须放在 /:userid 之前，否则会被当作 userid 参数命中
router.get('/options', requirePerms(PERMISSIONS.CASE_VIEW, PERMISSIONS.CASE_CREATE), getUserOptions);
router.get('/:userid', getUserById);
router.post('/', getUsers);

module.exports = router;
