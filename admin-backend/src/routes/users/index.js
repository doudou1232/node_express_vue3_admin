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
router.post('/update', updateUser);
router.post('/delete', deleteUser);
router.get('/:userid', getUserById);
router.post('/', getUsers);

module.exports = router;
