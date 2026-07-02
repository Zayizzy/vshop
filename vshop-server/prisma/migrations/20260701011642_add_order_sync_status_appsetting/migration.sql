-- AlterTable
ALTER TABLE "Order" ADD COLUMN "dianjiaSyncStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN "dianjiaSyncedAt" DATETIME;

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
