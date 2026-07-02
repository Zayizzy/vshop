-- AlterTable
ALTER TABLE "Aftersale" ADD COLUMN "refundId" TEXT;
ALTER TABLE "Aftersale" ADD COLUMN "refundStatus" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "prepayId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "provider" TEXT DEFAULT 'wechatpay';
ALTER TABLE "Payment" ADD COLUMN "transactionId" TEXT;
