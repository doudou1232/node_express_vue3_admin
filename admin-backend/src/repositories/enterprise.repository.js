const { companyPool: database } = require('@/config/database');
/**
 * 获取企业排名列表
 * @returns {Promise<object>} 企业排名列表
 */
async function getEnterpriseRankListRepository() {
  // 排名列表按名次升序返回，保证前端拿到的顺序稳定
  const sql = `SELECT * FROM \`enterprise_ranking\` ORDER BY \`rank_no\` ASC`;
  const [rows] = await database.query(sql);
  return rows;
}
module.exports = {
  getEnterpriseRankListRepository,
};
