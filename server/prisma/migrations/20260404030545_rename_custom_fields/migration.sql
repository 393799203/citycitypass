/*
  Warnings:

  - You are about to drop the column `customName` on the `PurchaseOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `customUnit` on the `PurchaseOrderItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PurchaseOrderItem" DROP COLUMN "customName",
DROP COLUMN "customUnit",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "unit" TEXT;
