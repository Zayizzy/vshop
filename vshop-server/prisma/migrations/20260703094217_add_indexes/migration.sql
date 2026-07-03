-- Drop redundant single-column index on ChatSession.goodId (foreign key column already auto-indexed by MySQL)
DROP INDEX `ChatSession_goodId_idx` ON `chatsession`;
