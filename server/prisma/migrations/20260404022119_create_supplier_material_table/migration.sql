/*
  Warnings:

  - You are about to drop the column `customName` on the `SupplierProduct` table. All the data in the column will be lost.
  - You are about to drop the column `customUnit` on the `SupplierProduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SupplierProduct" DROP COLUMN "customName",
DROP COLUMN "customUnit";

-- CreateTable
CREATE TABLE "SupplierMaterial" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT,
    "price" DECIMAL(12,2),
    "minQty" INTEGER DEFAULT 1,
    "leadDays" INTEGER,
    "status" "SupplierProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierMaterial_supplierId_idx" ON "SupplierMaterial"("supplierId");

-- AddForeignKey
ALTER TABLE "SupplierMaterial" ADD CONSTRAINT "SupplierMaterial_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
