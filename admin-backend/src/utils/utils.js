const moment = require('moment');

/**
 * 将日期格式化为指定文本。
 * @param {Date | string | number} time 日期值
 * @param {string} dateType 日期格式
 * @returns {string} 格式化后的日期
 */
function formatDate(time, dateType = 'YYYY-MM-DD') {
  return moment(time).format(dateType);
}

module.exports = { formatDate };
