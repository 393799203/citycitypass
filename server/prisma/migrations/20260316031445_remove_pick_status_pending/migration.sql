/*
  Warnings:

  - The values [PENDING] on the enum `PickStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PickStatus_new" AS ENUM ('PICKING', 'PICKED', 'CANCELLED');
ALTER TABLE "PickOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PickOrder" ALTER COLUMN "status" TYPE "PickStatus_new" USING ("status"::text::"PickStatus_new");
ALTER TYPE "PickStatus" RENAME TO "PickStatus_old";
ALTER TYPE "PickStatus_new" RENAME TO "PickStatus";
DROP TYPE "PickStatus_old";
ALTER TABLE "PickOrder" ALTER COLUMN "status" SET DEFAULT 'PICKING';
COMMIT;

-- AlterTable
ALTER TABLE "PickOrder" ALTER COLUMN "status" SET DEFAULT 'PICKING';
