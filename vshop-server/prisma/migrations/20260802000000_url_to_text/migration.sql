-- AlterTable: GoodImage.url and GoodDetailImage.url from VARCHAR(191) to TEXT
-- COS signed URLs can exceed 500 characters, need TEXT to store them

ALTER TABLE `GoodImage` MODIFY COLUMN `url` LONGTEXT NOT NULL;
ALTER TABLE `GoodDetailImage` MODIFY COLUMN `url` LONGTEXT NOT NULL;
