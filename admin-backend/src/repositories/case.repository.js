const { v4: uuidv4 } = require('uuid');
// 配置层现在导出多个连接池，这里只取默认库的连接池，保持后续 database.execute 调用不变
const { pool: database } = require('@/config/database');
const { STAGE_STATUS } = require('@/constants/case');

/** 阶段表中代表"流程已结束"的阶段状态 */
const STAGE_STATUS_FINISHED = STAGE_STATUS.FINISHED;
/** 阶段表中代表"正在办理"的阶段状态 */
const STAGE_STATUS_RUNNING = STAGE_STATUS.RUNNING;
/** 新建办件时自动生成的首个阶段名称 */
const FIRST_STAGE_NAME = '受理';

/**
 * 主表查询字段。
 * 刻意不返回自增 id：id 只在库内部使用，任何接口都不应把它暴露出去。
 */
const CASE_SELECT_FIELDS = `
  caseguid, case_no, userid, business_name, dept_name, consult_phone,
  handler_name, status, apply_time, finish_time, remark, create_time, update_time
`;

/**
 * 转义 LIKE 模糊查询中的通配符（% _ \），
 * 防止用户输入 % 当作通配符导致查出全表。
 * @param {string} value 用户输入的查询关键字
 * @returns {string} 转义后的关键字
 */
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

/**
 * 查询办件列表，支持按用户、办件编号、业务名称模糊筛选，按状态精确筛选。
 * 多个条件同时传时为 AND 关系；全部不传时查全部。
 * @param {object} filters 查询条件 { userid, caseNo, businessName, status }
 * @returns {Promise<Array>} 办件列表
 */
async function findAllCases(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.userid) {
    conditions.push('userid = ?');
    values.push(filters.userid);
  }
  if (filters.caseNo) {
    conditions.push('case_no LIKE ?');
    values.push(`%${escapeLike(filters.caseNo)}%`);
  }
  if (filters.businessName) {
    conditions.push('business_name LIKE ?');
    values.push(`%${escapeLike(filters.businessName)}%`);
  }
  if (filters.status !== undefined && filters.status !== null) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  let sql = `SELECT ${CASE_SELECT_FIELDS} FROM \`biz_case\``;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  // 列表默认按申请时间倒序，时间相同再按内部 id 保证顺序稳定
  sql += ' ORDER BY apply_time DESC, id DESC';

  const [rows] = await database.execute(sql, values);
  return rows;
}

/**
 * 按对外标识查询办件主表。
 * @param {string} caseGuid 办件对外唯一标识
 * @returns {Promise<object|null>} 办件信息，未找到返回 null（上层转 404）
 */
async function findCaseByGuid(caseGuid) {
  const [rows] = await database.execute(
    `SELECT ${CASE_SELECT_FIELDS} FROM \`biz_case\` WHERE caseguid = ?`,
    [caseGuid]
  );
  return rows[0] || null;
}

/**
 * 查询某办件的全部阶段，按 sort_no 升序展开时间轴。
 * @param {string} caseGuid 办件对外唯一标识
 * @returns {Promise<Array>} 阶段列表
 */
async function findStagesByCaseGuid(caseGuid) {
  const [rows] = await database.execute(
    `SELECT sort_no, stage_name, status, handler_name, dept_name,
            start_time, end_time, opinion, create_time
     FROM \`biz_case_stage\`
     WHERE case_guid = ?
     ORDER BY sort_no ASC, id ASC`,
    [caseGuid]
  );
  return rows;
}

/**
 * 查询指定前缀下编号最大的办件，用于生成当日流水号。
 * 返回整条 case_no 由上层截取流水段，避免在 SQL 里做字符串切割。
 * @param {string} prefix 编号前缀，如 BJ20261111
 * @returns {Promise<string|null>} 最大编号，当日无办件时返回 null
 */
async function findLatestCaseNo(prefix) {
  const [rows] = await database.execute(
    'SELECT case_no FROM `biz_case` WHERE case_no LIKE ? ORDER BY case_no DESC LIMIT 1',
    [`${prefix}%`]
  );
  return rows[0] ? rows[0].case_no : null;
}

/**
 * 新建办件，并在同一事务内生成首个"受理"阶段。
 * 主表与阶段表必须一起成功，否则会出现没有阶段的办件，详情页时间轴为空。
 * @param {object} info 办件信息
 * @param {string} info.caseNo 业务编号
 * @param {string} info.userid 关联用户 UUID
 * @param {string} info.businessName 办理业务名称
 * @param {string|null} info.deptName 办件部门
 * @param {string|null} info.consultPhone 咨询电话
 * @param {string|null} info.handlerName 办理人
 * @param {number} info.status 办件状态
 * @param {string|null} info.applyTime 申请时间，为空时取数据库当前时间
 * @param {string|null} info.remark 备注
 * @returns {Promise<object>} 新办件的对外标识与编号
 */
async function addCase(info) {
  const caseGuid = uuidv4();
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO \`biz_case\`
        (caseguid, case_no, userid, business_name, dept_name, consult_phone,
         handler_name, status, apply_time, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?)`,
      [
        caseGuid,
        info.caseNo,
        info.userid,
        info.businessName,
        info.deptName ?? null,
        info.consultPhone ?? null,
        info.handlerName ?? null,
        info.status,
        info.applyTime ?? null,
        info.remark ?? null
      ]
    );

    // 首阶段直接置为"进行中"，让时间轴从一开始就有当前节点
    await connection.execute(
      `INSERT INTO \`biz_case_stage\`
        (case_guid, stage_name, sort_no, status, handler_name, dept_name, start_time)
       VALUES (?, ?, 1, ?, ?, ?, COALESCE(?, NOW()))`,
      [
        caseGuid,
        FIRST_STAGE_NAME,
        STAGE_STATUS_RUNNING,
        info.handlerName ?? null,
        info.deptName ?? null,
        info.applyTime ?? null
      ]
    );

    await connection.commit();
    return { caseguid: caseGuid, case_no: info.caseNo };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 按对外标识全量更新办件主表。
 * 未传的字段会被置空，与用户表的更新语义保持一致。
 * @param {string} caseGuid 办件对外唯一标识
 * @param {object} info 更新后的办件信息
 * @returns {Promise<object|null>} 更新成功返回标识，办件不存在返回 null（上层转 404）
 */
async function updateCaseByGuid(caseGuid, info) {
  const [result] = await database.execute(
    `UPDATE \`biz_case\`
     SET business_name = ?, dept_name = ?, consult_phone = ?, handler_name = ?,
         status = ?, apply_time = ?, finish_time = ?, remark = ?, update_time = NOW()
     WHERE caseguid = ?`,
    [
      info.businessName,
      info.deptName,
      info.consultPhone,
      info.handlerName,
      info.status,
      info.applyTime,
      info.finishTime,
      info.remark,
      caseGuid
    ]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return { caseguid: caseGuid };
}

/**
 * 删除办件及其全部阶段。
 * 两张表没有数据库外键约束，必须手动先后删除，因此放入同一事务保证一致性。
 * @param {string} caseGuid 办件对外唯一标识
 * @returns {Promise<object|null>} 删除成功返回标识，办件不存在返回 null（上层转 404）
 */
async function removeCaseByGuid(caseGuid) {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    // 先删子表，主表删不掉时整体回滚，不会残留半个办件
    await connection.execute('DELETE FROM `biz_case_stage` WHERE case_guid = ?', [caseGuid]);
    const [result] = await connection.execute(
      'DELETE FROM `biz_case` WHERE caseguid = ?',
      [caseGuid]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return null;
    }

    await connection.commit();
    return { caseguid: caseGuid };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 推进办件流程：结束当前阶段、追加新阶段、同步主表状态。
 * 三个动作放在同一事务，并用 FOR UPDATE 锁住主表行，
 * 避免同一办件并发流转时出现两条"进行中"阶段。
 * @param {object} stageInfo 流转信息
 * @param {string} stageInfo.caseGuid 办件对外唯一标识
 * @param {string} stageInfo.stageName 新阶段名称
 * @param {string|null} stageInfo.handlerName 本阶段办理人
 * @param {string|null} stageInfo.deptName 本阶段办理部门
 * @param {string|null} stageInfo.opinion 办理意见
 * @param {number} stageInfo.caseStatus 流转后的办件状态
 * @param {boolean} stageInfo.finishTime 是否需要写入办理完成时间
 * @returns {Promise<object|null>} 流转结果，办件不存在返回 null（上层转 404）
 */
async function advanceStage(stageInfo) {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [caseRows] = await connection.execute(
      'SELECT id FROM `biz_case` WHERE caseguid = ? FOR UPDATE',
      [stageInfo.caseGuid]
    );

    if (caseRows.length === 0) {
      await connection.rollback();
      return null;
    }

    // 关闭上一个仍在进行中的阶段，阶段表只增不改，历史记录完整保留
    await connection.execute(
      `UPDATE \`biz_case_stage\`
       SET status = ?, end_time = NOW()
       WHERE case_guid = ? AND status = ?`,
      [STAGE_STATUS_FINISHED, stageInfo.caseGuid, STAGE_STATUS_RUNNING]
    );

    const [sortRows] = await connection.execute(
      'SELECT COALESCE(MAX(sort_no), 0) AS maxSort FROM `biz_case_stage` WHERE case_guid = ?',
      [stageInfo.caseGuid]
    );
    const nextSort = Number(sortRows[0].maxSort) + 1;

    // 流转到办结状态时，新阶段自身也应立即结束，否则时间轴末尾会一直挂着一个"进行中"
    const isFinished = Boolean(stageInfo.finishTime);
    const newStageStatus = isFinished ? STAGE_STATUS_FINISHED : STAGE_STATUS_RUNNING;

    await connection.execute(
      `INSERT INTO \`biz_case_stage\`
        (case_guid, stage_name, sort_no, status, handler_name, dept_name, start_time, end_time, opinion)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), IF(?, NOW(), NULL), ?)`,
      [
        stageInfo.caseGuid,
        stageInfo.stageName,
        nextSort,
        newStageStatus,
        // mysql2 不接受 undefined，缺省统一落成 NULL
        stageInfo.handlerName ?? null,
        stageInfo.deptName ?? null,
        isFinished ? 1 : 0,
        stageInfo.opinion ?? null
      ]
    );

    // 主表只保存"当前"办理人与状态，历史办理人由阶段表承担
    await connection.execute(
      `UPDATE \`biz_case\`
       SET status = ?,
           handler_name = COALESCE(?, handler_name),
           dept_name = COALESCE(?, dept_name),
           finish_time = CASE WHEN ? = 1 THEN NOW() ELSE finish_time END,
           update_time = NOW()
       WHERE caseguid = ?`,
      [
        stageInfo.caseStatus,
        // COALESCE 需要 NULL 才生效，undefined 会被 mysql2 直接拒绝
        stageInfo.handlerName ?? null,
        stageInfo.deptName ?? null,
        stageInfo.finishTime ? 1 : 0,
        stageInfo.caseGuid
      ]
    );

    await connection.commit();
    return {
      caseguid: stageInfo.caseGuid,
      stage_name: stageInfo.stageName,
      sort_no: nextSort,
      status: stageInfo.caseStatus
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  findAllCases,
  findCaseByGuid,
  findStagesByCaseGuid,
  findLatestCaseNo,
  addCase,
  updateCaseByGuid,
  removeCaseByGuid,
  advanceStage
};
