-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ItemType" ADD VALUE 'MATERIAL';
ALTER TYPE "ItemType" ADD VALUE 'OTHER';

-- DropIndex
DROP INDEX "SupplierProduct_supplierId_bundleId_key";

-- DropIndex
DROP INDEX "SupplierProduct_supplierId_skuId_key";

-- AlterTable
ALTER TABLE "SupplierProduct" ADD COLUMN     "customName" TEXT;
