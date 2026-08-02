-- AlterTable: OrderItem.image from VARCHAR(191) to LONGTEXT
-- 修复：下单时 prisma.order.create() 报 "Column: image too long"
-- 原因：image 存的是 GoodImage.url 的副本（已为 LONGTEXT），但 OrderItem.image 仍是 VARCHAR(191)
-- COS URL（含签名/长路径）超过 191 字符即写入失败，导致整单 500

ALTER TABLE `OrderItem` MODIFY COLUMN `image` LONGTEXT;
