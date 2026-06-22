/*
  Warnings:

  - You are about to alter the column `minAmount` on the `Coupon` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `value` on the `Coupon` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `freight` on the `GoodSupplier` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `price` on the `GoodSupplier` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `discountAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `freightAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `payAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `totalAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `price` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `marketPrice` on the `Sku` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `price` on the `Sku` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.

*/
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
    "expireTime" DATETIME NOT NULL
);
INSERT INTO "new_Coupon" ("discountValue", "expireTime", "id", "minAmount", "name", "scopeType", "totalCount", "type", "usedCount", "value") SELECT "discountValue", "expireTime", "id", "minAmount", "name", "scopeType", "totalCount", "type", "usedCount", "value" FROM "Coupon";
DROP TABLE "Coupon";
ALTER TABLE "new_Coupon" RENAME TO "Coupon";
CREATE TABLE "new_GoodSupplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goodId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "freight" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "GoodSupplier_goodId_fkey" FOREIGN KEY ("goodId") REFERENCES "Good" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodSupplier_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GoodSupplier" ("freight", "goodId", "id", "price", "skuId", "status", "stock", "supplierId") SELECT "freight", "goodId", "id", "price", "skuId", "status", "stock", "supplierId" FROM "GoodSupplier";
DROP TABLE "GoodSupplier";
ALTER TABLE "new_GoodSupplier" RENAME TO "GoodSupplier";
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderSn" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addressId" TEXT,
    "supplierId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalAmount" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "freightAmount" INTEGER NOT NULL DEFAULT 0,
    "payAmount" INTEGER NOT NULL,
    "remark" TEXT,
    "kocId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("addressId", "createdAt", "discountAmount", "freightAmount", "id", "kocId", "orderSn", "payAmount", "remark", "status", "supplierId", "totalAmount", "updatedAt", "userId") SELECT "addressId", "createdAt", "discountAmount", "freightAmount", "id", "kocId", "orderSn", "payAmount", "remark", "status", "supplierId", "totalAmount", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderSn_key" ON "Order"("orderSn");
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "goodTitle" TEXT NOT NULL,
    "specName" TEXT,
    "image" TEXT,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("goodTitle", "id", "image", "orderId", "price", "quantity", "skuId", "specName") SELECT "goodTitle", "id", "image", "orderId", "price", "quantity", "skuId", "specName" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "id", "orderId", "payTime", "status") SELECT "amount", "createdAt", "id", "orderId", "payTime", "status" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
CREATE TABLE "new_Sku" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goodId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "marketPrice" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Sku_goodId_fkey" FOREIGN KEY ("goodId") REFERENCES "Good" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sku" ("goodId", "id", "marketPrice", "name", "price", "stock") SELECT "goodId", "id", "marketPrice", "name", "price", "stock" FROM "Sku";
DROP TABLE "Sku";
ALTER TABLE "new_Sku" RENAME TO "Sku";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
