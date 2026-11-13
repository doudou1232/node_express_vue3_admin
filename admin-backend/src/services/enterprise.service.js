const { getEnterpriseRankListRepository } = require('@/repositories/enterprise.repository');
/**
 * 获取企业排名列表
 * @returns {Promise<object>} 企业排名列表
 */
async function getEnterpriseRankListService() {
  return await getEnterpriseRankListRepository();
}
module.exports = {
  getEnterpriseRankListService,
};
