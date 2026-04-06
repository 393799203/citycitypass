/*
  Warnings:

  - You are about to drop the `PurchaseDelivery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseDeliveryItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PurchaseDelivery" DROP CONSTRAINT "PurchaseDelivery_purchaseOrderId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseDeliveryItem" DROP CONSTRAINT "PurchaseDeliveryItem_purchaseDeliveryId_fkey";

-- DropTable
DROP TABLE "PurchaseDelivery";

-- DropTable
DROP TABLE "PurchaseDeliveryItem";

-- DropEnum
DROP TYPE "DeliveryItemStatus";

-- DropEnum
DROP TYPE "DeliveryStatus";
