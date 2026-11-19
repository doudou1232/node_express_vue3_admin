
const { getEnterpriseRankListService } = require('@/services/enterprise.service');
/**
 * 获取企业排名列表
 * @param {object} request 请求对象
 * @param {object} response 响应对象
 * @returns {Promise<void>} 无返回值
 */
async function getEnterpriseRankList(request, response) {
  try {
    const rankList = await getEnterpriseRankListService();
    response.status(200).json({ code: 200, message: "获取企业排名列表成功", data: rankList });
  } catch (error) {
    response
      .status(200)
      .json({ code: 500, message: "获取企业排名列表失败", data: null });
  }
}

module.exports = {
  getEnterpriseRankList,
};
