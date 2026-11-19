/**
 * 把指定账号的密码重置为统一初始密码，并导出一份明文清单。
 * 用法：node db/reset-initial-password.js
 * 注意：明文清单写在仓库外，避免被 git 提交；admin 账号不在重置范围内。
 */
require('dotenv').config();
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const { pool: database } = require('@/config/database');
const { hashPassword, verifyPassword } = require('@/utils/password');
const { resolvePermissions, ROLE_LABELS } = require('@/constants/permission');

/** 统一初始密码 */
const INITIAL_PASSWORD = 'Case@2026';

/** 需要重置的账号（admin 保持原密码，防止把管理员自己锁在外面） */
const TARGET_USERS = ['suncheng', 'fangxiyao', 'wuyu', 'zhouchen'];

/** CSV 单元格转义 */
function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

(async () => {
  const exported = [];

  for (const username of TARGET_USERS) {
    const [rows] = await database.execute(
      'SELECT userid, username, real_name AS realName, roles, status FROM `sys_user` WHERE username = ?',
      [username]
    );
    const user = rows[0];
    if (!user) {
      console.log(`○ 跳过 ${username}：账号不存在`);
      continue;
    }
    if (Number(user.status) !== 1) {
      console.log(`○ 跳过 ${username}：账号已停用`);
      continue;
    }

    await database.execute(
      'UPDATE `sys_user` SET password_hash = ?, update_time = NOW() WHERE username = ?',
      [hashPassword(INITIAL_PASSWORD), username]
    );

    // 立刻用校验函数回读，确认写入的哈希能被同一个密码验证通过
    const [checkRows] = await database.execute(
      'SELECT password_hash FROM `sys_user` WHERE username = ?',
      [username]
    );
    const ok = verifyPassword(INITIAL_PASSWORD, checkRows[0].password_hash);
    console.log(`✔ ${username.padEnd(11)} 密码已重置，校验结果：${ok ? '通过' : '失败'}`);

    exported.push({
      realName: user.realName || '',
      username: user.username,
      password: INITIAL_PASSWORD,
      roles: `${user.roles}（${String(user.roles)
        .split(',')
        .map(role => ROLE_LABELS[role] || role)
        .join('、')}）`,
      permissions: resolvePermissions(user.roles).join(' ')
    });
  }

  // 明文清单放到仓库外：优先桌面，没有桌面则放用户主目录
  const desktop = path.join(process.env.USERPROFILE || '', 'Desktop');
  const targetDir = fs.existsSync(desktop) ? desktop : process.env.USERPROFILE || __dirname;
  const outputPath = path.join(targetDir, '办件账号-初始密码.csv');

  const header = ['姓名', '登录账号', '初始密码', '角色', '有效权限'];
  const lines = [header.join(',')];
  exported.forEach(item => {
    lines.push(
      [item.realName, item.username, item.password, item.roles, item.permissions]
        .map(csvCell)
        .join(',')
    );
  });

  fs.writeFileSync(outputPath, '\uFEFF' + lines.join('\r\n') + '\r\n', 'utf8');
  console.log(`\n明文清单已导出（仓库外）：${outputPath}`);
  console.log(`账号数：${exported.length}，admin 账号密码未改动`);
  process.exit(0);
})().catch(error => {
  console.error('重置失败：', error.message);
  process.exit(1);
});
