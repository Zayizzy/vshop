-- CreateTable
CREATE TABLE "GoodDetailImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goodId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GoodDetailImage_goodId_fkey" FOREIGN KEY ("goodId") REFERENCES "Good" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
