-- AlterTable
ALTER TABLE `user` ADD COLUMN `unionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_unionId_key` ON `User`(`unionId`);
