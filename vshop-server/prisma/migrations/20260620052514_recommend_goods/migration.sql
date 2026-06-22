-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Good" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subCategoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "detail" TEXT,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "discountRate" REAL,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "recommendSort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Good_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Good" ("createdAt", "description", "detail", "discountRate", "id", "name", "sales", "status", "subCategoryId", "updatedAt") SELECT "createdAt", "description", "detail", "discountRate", "id", "name", "sales", "status", "subCategoryId", "updatedAt" FROM "Good";
DROP TABLE "Good";
ALTER TABLE "new_Good" RENAME TO "Good";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
