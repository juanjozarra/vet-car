-- CreateEnum
CREATE TYPE "WorkOrderProgressStage" AS ENUM ('INSPECTING', 'REPAIRING', 'WAITING_PARTS');

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "progressStage" "WorkOrderProgressStage";
