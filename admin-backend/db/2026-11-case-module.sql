-- 办件模块 + 权限体系 数据库变更
-- 说明：
--   1. 角色与权限沿用 sys_user 已有的 roles / permissions 字段（逗号分隔），不新增关联表。
--   2. 建表语句里已有 uk_caseguid、uk_case_no、idx_userid_apply、idx_status_apply、
--      idx_business_name、idx_caseguid_sort 等索引，本文件只补真正缺失的部分，
--      不再重复创建同类索引（重复索引只增加写入成本，不提升查询）。
--   3. 执行方式：node admin-backend/db/run-sql.js db/2026-11-case-module.sql
--      可重复执行，重复建索引的报错会被 run-sql.js 跳过。

-- 列表在无筛选时按 apply_time 倒序取第一页。
-- 复合索引 (userid, apply_time)、(status, apply_time) 都以 userid/status 开头，无法单独支撑纯时间排序。
ALTER TABLE `biz_case` ADD INDEX `idx_biz_case_apply_time` (`apply_time`);

-- 统一排序规则：sys_user.userid 是 utf8mb4_0900_ai_ci，biz_case.userid 原为 utf8mb4_unicode_ci，
-- 两表 LEFT JOIN 时会报 Illegal mix of collations，这里对齐到 sys_user 一侧。
ALTER TABLE `biz_case` MODIFY `userid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL;

-- 权限体系初始化：系统中还没有管理员时，把 id 最小的启用用户设为管理员。
-- 目的是让权限体系能被引导起来，之后可在「用户管理」里给其他人分配角色。
UPDATE `sys_user`
SET roles = 'admin', permissions = '*:*:*'
WHERE id = (
        SELECT min_id FROM (SELECT MIN(id) AS min_id FROM `sys_user` WHERE status = 1) AS t
      )
  AND NOT EXISTS (
        SELECT 1 FROM (SELECT COUNT(*) AS c FROM `sys_user` WHERE FIND_IN_SET('admin', roles)) AS t2
        WHERE t2.c > 0
      );
