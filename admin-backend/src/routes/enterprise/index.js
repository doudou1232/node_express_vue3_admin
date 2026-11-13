const express = require('express');
const { getEnterpriseRankList } = require('@/controllers/enterprise.controller');

const { authenticate } = require('@/middlewares/auth.middleware');
const router = express.Router();

router.get('/rank', getEnterpriseRankList);

module.exports = router;