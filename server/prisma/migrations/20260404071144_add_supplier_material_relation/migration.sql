/*
  Warnings:

  - You are about to drop the column `unit` on the `InboundOrderItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InboundOrderItem" DROP COLUMN "unit";

-- AddForeignKey
ALTER TABLE "InboundOrderItem" ADD CONSTRAINT "InboundOrderItem_supplierMaterialId_fkey" FOREIGN KEY ("supplierMaterialId") REFERENCES "SupplierMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
