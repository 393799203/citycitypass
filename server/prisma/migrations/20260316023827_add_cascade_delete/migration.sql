-- DropForeignKey
ALTER TABLE "PickOrder" DROP CONSTRAINT "PickOrder_orderId_fkey";

-- AddForeignKey
ALTER TABLE "PickOrder" ADD CONSTRAINT "PickOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
