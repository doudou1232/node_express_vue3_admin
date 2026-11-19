const express = require('express');
const {
  loginHandler,
  refreshTokenHandler,
  getProfileHandler,
  logoutHandler
} = require('@/controllers/auth.controller');
const { authenticate } = require('@/middlewares/auth.middleware');

const router = express.Router();

// 登录与刷新必须是免鉴权接口，否则 token 过期后无法自救
router.post('/login', loginHandler);
router.post('/refresh-token', refreshTokenHandler);

// 以下接口需要携带 accessToken
router.get('/profile', authenticate, getProfileHandler);
router.post('/logout', authenticate, logoutHandler);

module.exports = router;
