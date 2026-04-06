-- AlterTable
ALTER TABLE "InboundOrderItem" ADD COLUMN     "supplierId" TEXT;

-- AddForeignKey
ALTER TABLE "InboundOrderItem" ADD CONSTRAINT "InboundOrderItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
