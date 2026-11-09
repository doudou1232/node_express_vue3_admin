const express = require('express');
const {
  addUser,
  getUserById,
  updateUser,
  deleteUser,
  getUsers
} = require('@/controllers/user.controller');

const router = express.Router();

router.post('/add', addUser);
// 更新：控制器从 body.userid 取标识，与详情/删除保持同样的 userid 语义
router.post('/update', updateUser);
router.post('/delete', deleteUser);
router.get('/:userid', getUserById);
router.post('/', getUsers);

module.exports = router;
