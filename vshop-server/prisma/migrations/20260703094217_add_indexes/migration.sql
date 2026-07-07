-- Drop redundant single-column index on ChatSession.goodId (foreign key column already auto-indexed by MySQL)
-- 使用动态 SQL 保证幂等：索引存在时才删除，避免在 shadow database 上因索引不存在而报错。
SET @drop_idx_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE table_schema = DATABASE()
        AND table_name = 'chatsession'
        AND index_name = 'ChatSession_goodId_idx'
    ),
    'DROP INDEX `ChatSession_goodId_idx` ON `chatsession`',
    'SELECT 1'
  )
);
PREPARE drop_idx_stmt FROM @drop_idx_sql;
EXECUTE drop_idx_stmt;
DEALLOCATE PREPARE drop_idx_stmt;
