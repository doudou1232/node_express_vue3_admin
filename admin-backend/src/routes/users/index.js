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
router.put('/update/:id', updateUser);
router.delete('/delete/:id', deleteUser);
router.get('/:id', getUserById);
router.get('/', getUsers);

module.exports = router;
