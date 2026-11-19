/**
 * 极简 SQL 执行器：按分号切分 db/*.sql 并逐条执行。
 * 用途是让建表/加索引这类变更可以重复执行，避免手工粘贴出错。
 * 用法：node admin-backend/db/run-sql.js db/2026-11-case-module.sql
 */
require('dotenv').config();
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const { pool: database } = require('@/config/database');

/** 可忽略的错误：重复建索引 / 重复列 */
const IGNORABLE_CODES = ['ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME'];

/**
 * 去掉整行注释后按分号切分成语句列表。
 * @param {string} sqlText SQL 文件内容
 * @returns {Array<string>} 语句列表
 */
function splitStatements(sqlText) {
  return sqlText
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

/**
 * 执行 SQL 文件。
 * @param {string} filePath SQL 文件路径（相对 admin-backend 目录）
 * @returns {Promise<void>}
 */
async function runSqlFile(filePath) {
  const absolutePath = path.resolve(__dirname, '..', filePath);
  const statements = splitStatements(fs.readFileSync(absolutePath, 'utf8'));

  for (const statement of statements) {
    const preview = statement.replace(/\s+/g, ' ').slice(0, 80);
    try {
      const [result] = await database.query(statement);
      console.log(`✔ ${preview} -> ${result.affectedRows ?? 0} 行受影响`);
    } catch (error) {
      if (IGNORABLE_CODES.includes(error.code)) {
        console.log(`○ 跳过（已存在）：${preview}`);
        continue;
      }
      throw error;
    }
  }
}

const target = process.argv[2];
if (!target) {
  console.error('请传入 SQL 文件路径，例如：node db/run-sql.js db/2026-11-case-module.sql');
  process.exit(1);
}

runSqlFile(target)
  .then(() => {
    console.log('SQL 执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('SQL 执行失败：', error.code || '', error.message);
    process.exit(1);
  });
