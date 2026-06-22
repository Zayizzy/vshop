-- AlterTable
ALTER TABLE "Good" ADD COLUMN "discountRate" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER,
    "discountValue" REAL,
    "minAmount" INTEGER NOT NULL DEFAULT 0,
    "scopeType" TEXT NOT NULL DEFAULT 'all',
    "totalCount" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expireTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active'
);
INSERT INTO "new_Coupon" ("discountValue", "expireTime", "id", "minAmount", "name", "scopeType", "totalCount", "type", "usedCount", "value") SELECT "discountValue", "expireTime", "id", "minAmount", "name", "scopeType", "totalCount", "type", "usedCount", "value" FROM "Coupon";
DROP TABLE "Coupon";
ALTER TABLE "new_Coupon" RENAME TO "Coupon";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
