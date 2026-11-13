const { companyPool: database } = require('@/config/database');
/**
 * 获取企业排名列表
 * @returns {Promise<object>} 企业排名列表
 */
async function getEnterpriseRankListRepository() {
  const sql = `SELECT * FROM \`enterprise_ranking\``;
  const [rows] = await database.query(sql);
  return rows;
}
module.exports = {
  getEnterpriseRankListRepository,
};
