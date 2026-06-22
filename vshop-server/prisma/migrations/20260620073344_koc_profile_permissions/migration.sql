-- CreateTable
CREATE TABLE "KocProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "realName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "socialAccount" TEXT,
    "introduction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "commissionRate" REAL,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KocProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openid" TEXT NOT NULL,
    "nickname" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "isKoc" BOOLEAN NOT NULL DEFAULT false,
    "kocApprovedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "id", "location", "nickname", "openid", "phone", "updatedAt") SELECT "avatar", "createdAt", "id", "location", "nickname", "openid", "phone", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_openid_key" ON "User"("openid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "KocProfile_userId_key" ON "KocProfile"("userId");
