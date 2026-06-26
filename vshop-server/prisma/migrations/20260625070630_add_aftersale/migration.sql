-- CreateTable
CREATE TABLE "Aftersale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aftersaleSn" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "packageIndex" INTEGER NOT NULL DEFAULT 0,
    "type" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "evidenceImages" TEXT NOT NULL,
    "refundAmount" INTEGER NOT NULL,
    "refundNo" TEXT,
    "adminRemark" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aftersale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Aftersale_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Aftersale_aftersaleSn_key" ON "Aftersale"("aftersaleSn");

-- CreateIndex
CREATE INDEX "Aftersale_userId_idx" ON "Aftersale"("userId");

-- CreateIndex
CREATE INDEX "Aftersale_orderId_idx" ON "Aftersale"("orderId");

-- CreateIndex
CREATE INDEX "Aftersale_status_idx" ON "Aftersale"("status");
