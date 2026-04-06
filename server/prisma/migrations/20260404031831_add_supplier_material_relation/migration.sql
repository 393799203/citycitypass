/*
  Warnings:

  - You are about to drop the column `name` on the `PurchaseOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `PurchaseOrderItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PurchaseOrderItem" DROP COLUMN "name",
DROP COLUMN "unit",
ADD COLUMN     "supplierMaterialId" TEXT;

-- CreateIndex
CREATE INDEX "SupplierMaterial_supplierId_category_idx" ON "SupplierMaterial"("supplierId", "category");

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_supplierMaterialId_fkey" FOREIGN KEY ("supplierMaterialId") REFERENCES "SupplierMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
