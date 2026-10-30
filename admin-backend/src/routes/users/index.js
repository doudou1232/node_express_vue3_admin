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
router.put('/update/:userid', updateUser);
router.delete('/delete/:userid', deleteUser);
router.get('/:userid', getUserById);
router.post('/', getUsers);

module.exports = router;
