-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "isSelfOperated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductBrand" ADD COLUMN     "subCategory" TEXT;
