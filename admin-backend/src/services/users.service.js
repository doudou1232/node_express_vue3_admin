const {
  addUser,
  updateUserById,
  removeUserById
} = require('@/repositories/user.repository');

function createUser(userInfo) {
  return addUser(userInfo);
}

function updateUser(userId, userInfo) {
  return updateUserById(userId, userInfo);
}

function removeUser(userId) {
  return removeUserById(userId);
}

module.exports = {
  createUser,
  updateUser,
  removeUser
};
