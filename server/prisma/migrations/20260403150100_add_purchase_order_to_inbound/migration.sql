/*
  Warnings:

  - The values [PICKED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `orderId` on the `PickOrder` table. All the data in the column will be lost.
  - You are about to drop the column `subCategory` on the `ProductBrand` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `ProductSKU` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ProductSKU` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `ProductSKU` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `ProductSKU` table. All the data in the column will be lost.
  - You are about to drop the column `warehouseLocation` on the `ProductSKU` table. All the data in the column will be lost.
  - You are about to drop the column `warehouseId` on the `Shelf` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `Warehouse` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[skuCode]` on the table `ProductSKU` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[zoneId,code]` on the table `Shelf` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `city` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `warehouseId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderIds` to the `PickOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skuCode` to the `ProductSKU` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zoneId` to the `Shelf` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CustomerLevel" AS ENUM ('VIP', 'NORMAL', 'POTENTIAL');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SupplierProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PARTIAL', 'ARRIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseItemStatus" AS ENUM ('PENDING', 'PARTIAL', 'RECEIVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'ARRIVED', 'COMPLETED', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryItemStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REJECTED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PRODUCT', 'BUNDLE');

-- CreateEnum
CREATE TYPE "LockStatus" AS ENUM ('LOCKED', 'RELEASED', 'USED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('ZONE_TRANSFER', 'QUALITY_INSPECT', 'DAMAGED');

-- CreateEnum
CREATE TYPE "InboundSource" AS ENUM ('PURCHASE', 'RETURN', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "InboundStatus" AS ENUM ('PENDING', 'ARRIVED', 'RECEIVING', 'RECEIVED', 'PUTAWAY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'DISABLED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'IN_TRANSIT', 'RESTING', 'DISABLED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchOrderStatus" AS ENUM ('PENDING', 'DELIVERED', 'SIGNED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('RETURN_REQUESTED', 'RETURN_SHIPPED', 'RETURN_RECEIVING', 'RETURN_QUALIFIED', 'RETURN_PARTIAL_QUALIFIED', 'RETURN_REJECTED', 'RETURN_STOCK_IN', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReturnAction" AS ENUM ('CREATE', 'SHIPPED', 'RECEIVE', 'QUALIFY', 'PARTIAL', 'REJECT', 'STOCK_IN', 'REFUND', 'CANCEL');

-- CreateEnum
CREATE TYPE "CarrierType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "CarrierLevel" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "CarrierStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CarrierContractStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PICKING', 'OUTBOUND_REVIEW', 'DISPATCHING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'RETURNING', 'RETURNED', 'CANCELLED');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "PickStatus" ADD VALUE 'COMPLETED';

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_skuId_fkey";

-- DropForeignKey
ALTER TABLE "PickOrder" DROP CONSTRAINT "PickOrder_orderId_fkey";

-- DropForeignKey
ALTER TABLE "PickOrderItem" DROP CONSTRAINT "PickOrderItem_skuId_fkey";

-- DropForeignKey
ALTER TABLE "Shelf" DROP CONSTRAINT "Shelf_warehouseId_fkey";

-- DropIndex
DROP INDEX "PickOrder_orderId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "contractDiscount" DOUBLE PRECISION,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "province" TEXT NOT NULL,
ADD COLUMN     "warehouseId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "bundleId" TEXT,
ALTER COLUMN "skuId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "address" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PickOrder" DROP COLUMN "orderId",
ADD COLUMN     "approverId" TEXT,
ADD COLUMN     "orderIds" TEXT NOT NULL,
ADD COLUMN     "pickerId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PickOrderItem" ADD COLUMN     "bundleBatchId" TEXT,
ADD COLUMN     "bundleId" TEXT,
ADD COLUMN     "bundleStockLockId" TEXT,
ADD COLUMN     "skuBatchId" TEXT,
ADD COLUMN     "stockLockId" TEXT,
ALTER COLUMN "skuId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "subCategoryId" TEXT;

-- AlterTable
ALTER TABLE "ProductBrand" DROP COLUMN "subCategory";

-- AlterTable
ALTER TABLE "ProductSKU" DROP COLUMN "name",
DROP COLUMN "status",
DROP COLUMN "stock",
DROP COLUMN "unit",
DROP COLUMN "warehouseLocation",
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "skuCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Shelf" DROP COLUMN "warehouseId",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'HEAVY',
ADD COLUMN     "zoneId" TEXT NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Warehouse" DROP COLUMN "region",
ADD COLUMN     "businessEndTime" TEXT,
ADD COLUMN     "businessStartTime" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "manager" TEXT,
ADD COLUMN     "managerPhone" TEXT;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT,
    "region" TEXT,
    "level" "CustomerLevel" NOT NULL DEFAULT 'NORMAL',
    "contact" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "deliveryStartTime" TEXT,
    "deliveryEndTime" TEXT,
    "specialRequirements" TEXT,
    "inspectionRequired" BOOLEAN NOT NULL DEFAULT true,
    "certificateRequired" BOOLEAN NOT NULL DEFAULT false,
    "signatureNote" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2),
    "discount" DECIMAL(5,2),
    "pricingTerms" JSONB,
    "serviceTerms" TEXT,
    "specialTerms" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContract" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "amount" DECIMAL(12,2),
    "discount" DECIMAL(5,2),
    "serviceTerms" TEXT,
    "specialTerms" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSubCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandPackaging" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "packagingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandPackaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandSpec" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "productTags" TEXT[],
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "skuId" TEXT,
    "bundleId" TEXT,
    "price" DECIMAL(12,2),
    "minQty" INTEGER DEFAULT 1,
    "leadDays" INTEGER,
    "status" "SupplierProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "ownerId" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(12,2),
    "remark" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "skuId" TEXT,
    "bundleId" TEXT,
    "skuBatchId" TEXT,
    "bundleBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2),
    "amount" DECIMAL(12,2),
    "productionDate" TIMESTAMP(3),
    "expireDate" TIMESTAMP(3),
    "status" "PurchaseItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDelivery" (
    "id" TEXT NOT NULL,
    "deliveryNo" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "carrierName" TEXT,
    "trackingNo" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inboundOrderId" TEXT,

    CONSTRAINT "PurchaseDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDeliveryItem" (
    "id" TEXT NOT NULL,
    "purchaseDeliveryId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT,
    "itemType" "ItemType" NOT NULL,
    "skuId" TEXT,
    "bundleId" TEXT,
    "quantity" INTEGER NOT NULL,
    "qualifiedQuantity" INTEGER,
    "rejectedQuantity" INTEGER,
    "skuBatchId" TEXT,
    "bundleBatchId" TEXT,
    "locationId" TEXT,
    "status" "DeliveryItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseDeliveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleSKU" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleSKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleSKUItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleSKUItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleStock" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "bundleBatchId" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "lockedQuantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleStockLock" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "bundleBatchId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleStockLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleStockIn" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "bundleBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "BundleStockIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STORAGE',
    "warehouseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "shelfId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "transferNo" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" "TransferType" NOT NULL DEFAULT 'ZONE_TRANSFER',
    "fromZoneId" TEXT,
    "toZoneId" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "operator" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL DEFAULT 'PRODUCT',
    "skuId" TEXT,
    "bundleId" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "skuBatchId" TEXT,
    "bundleBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "skuBatchId" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "lockedQuantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLock" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "skuBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "LockStatus" NOT NULL DEFAULT 'LOCKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIn" (
    "id" TEXT NOT NULL,
    "stockId" TEXT,
    "skuId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "skuBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "operator" TEXT,

    CONSTRAINT "StockIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundOrder" (
    "id" TEXT NOT NULL,
    "inboundNo" TEXT NOT NULL,
    "source" "InboundSource" NOT NULL DEFAULT 'PURCHASE',
    "warehouseId" TEXT NOT NULL,
    "remark" TEXT,
    "purchaseOrderId" TEXT,
    "arrivalQuantity" INTEGER,
    "palletNo" TEXT,
    "vehicleNo" TEXT,
    "arrivedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "putawayAt" TIMESTAMP(3),
    "erpSyncStatus" TEXT,
    "erpSyncAt" TIMESTAMP(3),
    "status" "InboundStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundOrderItem" (
    "id" TEXT NOT NULL,
    "inboundId" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "skuId" TEXT,
    "bundleId" TEXT,
    "locationId" TEXT,
    "expectedQuantity" INTEGER,
    "receivedQuantity" INTEGER,
    "skuBatchId" TEXT,
    "bundleBatchId" TEXT,
    "inspectionResult" TEXT,
    "inspectionNote" TEXT,
    "putawayStatus" TEXT,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "InboundOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOut" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT,
    "bundleId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "skuBatchId" TEXT,
    "bundleBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operator" TEXT,

    CONSTRAINT "StockOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "capacity" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "licenseNo" TEXT,
    "insuranceNo" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "warehouseId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "licenseTypes" TEXT[],
    "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
    "warehouseId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL,
    "dispatchNo" TEXT NOT NULL,
    "vehicleSource" TEXT NOT NULL DEFAULT 'WAREHOUSE',
    "vehicleId" TEXT,
    "carrierVehicleId" TEXT,
    "driverId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "plannedRoute" JSONB,
    "actualRoute" JSONB,
    "totalDistance" DOUBLE PRECISION,
    "departureTime" TIMESTAMP(3),
    "completedTime" TIMESTAMP(3),
    "orderCount" INTEGER NOT NULL,
    "totalWeight" INTEGER NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchOrder" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "agentName" TEXT,
    "status" "DispatchOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnOrder" (
    "id" TEXT NOT NULL,
    "returnNo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'RETURN_REQUESTED',
    "reason" TEXT NOT NULL,
    "refundAmount" DECIMAL(12,2),
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "receiverAddress" TEXT,
    "trackingNo" TEXT,
    "logisticsCompany" TEXT,
    "operatorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnOrderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "skuId" TEXT,
    "bundleId" TEXT,
    "productName" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockOutId" TEXT,
    "qualifiedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnLog" (
    "id" TEXT NOT NULL,
    "returnOrderId" TEXT NOT NULL,
    "action" "ReturnAction" NOT NULL,
    "beforeStatus" TEXT,
    "afterStatus" TEXT,
    "operatorName" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CarrierType" NOT NULL DEFAULT 'INDIVIDUAL',
    "level" "CarrierLevel" NOT NULL DEFAULT 'C',
    "ownerId" TEXT,
    "businessLicenseNo" TEXT,
    "businessLicenseUrl" TEXT,
    "transportLicenseNo" TEXT,
    "transportLicenseUrl" TEXT,
    "serviceTypes" TEXT[],
    "coverageAreas" TEXT[],
    "vehicleTypes" TEXT[],
    "contact" TEXT,
    "phone" TEXT,
    "province" TEXT,
    "city" TEXT,
    "address" TEXT,
    "status" "CarrierStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierContract" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "serviceTerms" TEXT,
    "priceTerms" TEXT,
    "paymentTerms" TEXT,
    "liabilityTerms" TEXT,
    "amount" DOUBLE PRECISION,
    "deposit" DOUBLE PRECISION,
    "status" "CarrierContractStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierVehicle" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "capacity" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "licenseNo" TEXT,
    "licenseUrl" TEXT,
    "insuranceNo" TEXT,
    "insuranceUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location" TEXT,
    "address" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SKUBatch" (
    "id" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "productionDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SKUBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleBatch" (
    "id" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productionDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNo_key" ON "Contract"("contractNo");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierContract_contractNo_key" ON "SupplierContract"("contractNo");

-- CreateIndex
CREATE INDEX "SupplierContract_supplierId_idx" ON "SupplierContract"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSubCategory_code_key" ON "ProductSubCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingOption_code_key" ON "PackagingOption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SpecOption_code_key" ON "SpecOption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPackaging_brandId_packagingId_key" ON "BrandPackaging"("brandId", "packagingId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandSpec_brandId_specId_key" ON "BrandSpec"("brandId", "specId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierId_idx" ON "SupplierProduct"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierProduct_skuId_idx" ON "SupplierProduct"("skuId");

-- CreateIndex
CREATE INDEX "SupplierProduct_bundleId_idx" ON "SupplierProduct"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_skuId_key" ON "SupplierProduct"("supplierId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_bundleId_key" ON "SupplierProduct"("supplierId", "bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_orderNo_key" ON "PurchaseOrder"("orderNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_warehouseId_idx" ON "PurchaseOrder"("warehouseId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_ownerId_idx" ON "PurchaseOrder"("ownerId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_skuId_idx" ON "PurchaseOrderItem"("skuId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_bundleId_idx" ON "PurchaseOrderItem"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDelivery_deliveryNo_key" ON "PurchaseDelivery"("deliveryNo");

-- CreateIndex
CREATE INDEX "PurchaseDelivery_purchaseOrderId_idx" ON "PurchaseDelivery"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseDelivery_status_idx" ON "PurchaseDelivery"("status");

-- CreateIndex
CREATE INDEX "PurchaseDeliveryItem_purchaseDeliveryId_idx" ON "PurchaseDeliveryItem"("purchaseDeliveryId");

-- CreateIndex
CREATE INDEX "PurchaseDeliveryItem_purchaseOrderItemId_idx" ON "PurchaseDeliveryItem"("purchaseOrderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleSKU_skuCode_key" ON "BundleSKU"("skuCode");

-- CreateIndex
CREATE UNIQUE INDEX "BundleSKUItem_bundleId_skuId_key" ON "BundleSKUItem"("bundleId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleStock_warehouseId_locationId_bundleBatchId_key" ON "BundleStock"("warehouseId", "locationId", "bundleBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_warehouseId_code_key" ON "Zone"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Location_shelfId_level_position_key" ON "Location"("shelfId", "level", "position");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_transferNo_key" ON "StockTransfer"("transferNo");

-- CreateIndex
CREATE INDEX "StockTransfer_warehouseId_idx" ON "StockTransfer"("warehouseId");

-- CreateIndex
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");

-- CreateIndex
CREATE INDEX "StockTransferItem_transferId_idx" ON "StockTransferItem"("transferId");

-- CreateIndex
CREATE INDEX "StockTransferItem_skuId_idx" ON "StockTransferItem"("skuId");

-- CreateIndex
CREATE INDEX "StockTransferItem_bundleId_idx" ON "StockTransferItem"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_warehouseId_locationId_skuBatchId_key" ON "Stock"("warehouseId", "locationId", "skuBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "InboundOrder_inboundNo_key" ON "InboundOrder"("inboundNo");

-- CreateIndex
CREATE UNIQUE INDEX "InboundOrder_purchaseOrderId_key" ON "InboundOrder"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "InboundOrder_warehouseId_idx" ON "InboundOrder"("warehouseId");

-- CreateIndex
CREATE INDEX "InboundOrder_status_idx" ON "InboundOrder"("status");

-- CreateIndex
CREATE INDEX "InboundOrderItem_inboundId_idx" ON "InboundOrderItem"("inboundId");

-- CreateIndex
CREATE INDEX "StockOut_orderId_idx" ON "StockOut"("orderId");

-- CreateIndex
CREATE INDEX "StockOut_warehouseId_idx" ON "StockOut"("warehouseId");

-- CreateIndex
CREATE INDEX "StockOut_skuId_idx" ON "StockOut"("skuId");

-- CreateIndex
CREATE INDEX "StockOut_bundleId_idx" ON "StockOut"("bundleId");

-- CreateIndex
CREATE INDEX "StockOut_locationId_idx" ON "StockOut"("locationId");

-- CreateIndex
CREATE INDEX "StockOut_skuBatchId_idx" ON "StockOut"("skuBatchId");

-- CreateIndex
CREATE INDEX "StockOut_bundleBatchId_idx" ON "StockOut"("bundleBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_dispatchNo_key" ON "Dispatch"("dispatchNo");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnOrder_returnNo_key" ON "ReturnOrder"("returnNo");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_code_key" ON "Carrier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierContract_contractNo_key" ON "CarrierContract"("contractNo");

-- CreateIndex
CREATE UNIQUE INDEX "SKUBatch_skuId_batchNo_key" ON "SKUBatch"("skuId", "batchNo");

-- CreateIndex
CREATE UNIQUE INDEX "BundleBatch_bundleId_batchNo_key" ON "BundleBatch"("bundleId", "batchNo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSKU_skuCode_key" ON "ProductSKU"("skuCode");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_zoneId_code_key" ON "Shelf"("zoneId", "code");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubCategory" ADD CONSTRAINT "ProductSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPackaging" ADD CONSTRAINT "BrandPackaging_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ProductBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPackaging" ADD CONSTRAINT "BrandPackaging_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES "PackagingOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSpec" ADD CONSTRAINT "BrandSpec_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ProductBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSpec" ADD CONSTRAINT "BrandSpec_specId_fkey" FOREIGN KEY ("specId") REFERENCES "SpecOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDelivery" ADD CONSTRAINT "PurchaseDelivery_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDeliveryItem" ADD CONSTRAINT "PurchaseDeliveryItem_purchaseDeliveryId_fkey" FOREIGN KEY ("purchaseDeliveryId") REFERENCES "PurchaseDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ProductSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSKU" ADD CONSTRAINT "ProductSKU_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleSKU" ADD CONSTRAINT "BundleSKU_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleSKUItem" ADD CONSTRAINT "BundleSKUItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleSKUItem" ADD CONSTRAINT "BundleSKUItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStock" ADD CONSTRAINT "BundleStock_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStock" ADD CONSTRAINT "BundleStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStock" ADD CONSTRAINT "BundleStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStock" ADD CONSTRAINT "BundleStock_bundleBatchId_fkey" FOREIGN KEY ("bundleBatchId") REFERENCES "BundleBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockLock" ADD CONSTRAINT "BundleStockLock_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockLock" ADD CONSTRAINT "BundleStockLock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockLock" ADD CONSTRAINT "BundleStockLock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockLock" ADD CONSTRAINT "BundleStockLock_bundleBatchId_fkey" FOREIGN KEY ("bundleBatchId") REFERENCES "BundleBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockLock" ADD CONSTRAINT "BundleStockLock_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockIn" ADD CONSTRAINT "BundleStockIn_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockIn" ADD CONSTRAINT "BundleStockIn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockIn" ADD CONSTRAINT "BundleStockIn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleStockIn" ADD CONSTRAINT "BundleStockIn_bundleBatchId_fkey" FOREIGN KEY ("bundleBatchId") REFERENCES "BundleBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrder" ADD CONSTRAINT "PickOrder_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrder" ADD CONSTRAINT "PickOrder_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrderItem" ADD CONSTRAINT "PickOrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrderItem" ADD CONSTRAINT "PickOrderItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrderItem" ADD CONSTRAINT "PickOrderItem_skuBatchId_fkey" FOREIGN KEY ("skuBatchId") REFERENCES "SKUBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrderItem" ADD CONSTRAINT "PickOrderItem_bundleBatchId_fkey" FOREIGN KEY ("bundleBatchId") REFERENCES "BundleBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrderItem" ADD CONSTRAINT "PickOrderItem_stockLockId_fkey" FOREIGN KEY ("stockLockId") REFERENCES "StockLock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickOrderItem" ADD CONSTRAINT "PickOrderItem_bundleStockLockId_fkey" FOREIGN KEY ("bundleStockLockId") REFERENCES "BundleStockLock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromZoneId_fkey" FOREIGN KEY ("fromZoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toZoneId_fkey" FOREIGN KEY ("toZoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_skuBatchId_fkey" FOREIGN KEY ("skuBatchId") REFERENCES "SKUBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_bundleBatchId_fkey" FOREIGN KEY ("bundleBatchId") REFERENCES "BundleBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_skuBatchId_fkey" FOREIGN KEY ("skuBatchId") REFERENCES "SKUBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLock" ADD CONSTRAINT "StockLock_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLock" ADD CONSTRAINT "StockLock_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLock" ADD CONSTRAINT "StockLock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLock" ADD CONSTRAINT "StockLock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLock" ADD CONSTRAINT "StockLock_skuBatchId_fkey" FOREIGN KEY ("skuBatchId") REFERENCES "SKUBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIn" ADD CONSTRAINT "StockIn_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIn" ADD CONSTRAINT "StockIn_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIn" ADD CONSTRAINT "StockIn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIn" ADD CONSTRAINT "StockIn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIn" ADD CONSTRAINT "StockIn_skuBatchId_fkey" FOREIGN KEY ("skuBatchId") REFERENCES "SKUBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrder" ADD CONSTRAINT "InboundOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrder" ADD CONSTRAINT "InboundOrder_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrderItem" ADD CONSTRAINT "InboundOrderItem_inboundId_fkey" FOREIGN KEY ("inboundId") REFERENCES "InboundOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrderItem" ADD CONSTRAINT "InboundOrderItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrderItem" ADD CONSTRAINT "InboundOrderItem_skuBatchId_fkey" FOREIGN KEY ("skuBatchId") REFERENCES "SKUBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrderItem" ADD CONSTRAINT "InboundOrderItem_bundleBatchId_fkey" FOREIGN KEY ("bundleBatchId") REFERENCES "BundleBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOut" ADD CONSTRAINT "StockOut_skuBatchId_fkey" FOREIGN KEY ("skuBatchId") REFERENCES "SKUBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOut" ADD CONSTRAINT "StockOut_bundleBatchId_fkey" FOREIGN KEY ("bundleBatchId") REFERENCES "BundleBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_carrierVehicleId_fkey" FOREIGN KEY ("carrierVehicleId") REFERENCES "CarrierVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "ReturnOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnLog" ADD CONSTRAINT "ReturnLog_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "ReturnOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrier" ADD CONSTRAINT "Carrier_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierContract" ADD CONSTRAINT "CarrierContract_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierVehicle" ADD CONSTRAINT "CarrierVehicle_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SKUBatch" ADD CONSTRAINT "SKUBatch_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SKUBatch" ADD CONSTRAINT "SKUBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleBatch" ADD CONSTRAINT "BundleBatch_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleSKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleBatch" ADD CONSTRAINT "BundleBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
