-- CreateEnum
CREATE TYPE "PickStatus" AS ENUM ('PENDING', 'PICKING', 'PICKED');

-- AlterTable
ALTER TABLE "ProductSKU" ADD COLUMN     "warehouseLocation" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "PickOrder" (
    "id" TEXT NOT NULL,
    "pickNo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "PickStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickOrderItem" (
    "id" TEXT NOT NULL,
    "pickOrderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "warehouseLocation" TEXT NOT NULL,

    CONSTRAINT "PickOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PickOrder_pickNo_key" ON "PickOrder"("pickNo");

-- CreateIndex
CREATE UNIQUE INDEX "PickOrder_orderId_key" ON "PickOrder"("orderId");

-- AddForeignKey
ALTER TABLE "PickOrder" ADD CONSTRAINT "PickOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrderItem" ADD CONSTRAINT "PickOrderItem_pickOrderId_fkey" FOREIGN KEY ("pickOrderId") REFERENCES "PickOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrderItem" ADD CONSTRAINT "PickOrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
