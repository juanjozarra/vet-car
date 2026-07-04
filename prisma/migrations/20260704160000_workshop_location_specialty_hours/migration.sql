-- CreateEnum
CREATE TYPE "WorkshopSpecialty" AS ENUM ('MECANICA_GENERAL', 'ELECTRICIDAD_AUTOMOTRIZ', 'CHAPA_Y_PINTURA', 'NEUMATICOS_Y_LLANTAS', 'DIAGNOSTICO_ELECTRONICO', 'TRANSMISION', 'AIRE_ACONDICIONADO', 'OTRO');

-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "slotDurationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "specialties" "WorkshopSpecialty"[] DEFAULT ARRAY[]::"WorkshopSpecialty"[];

-- CreateTable
CREATE TABLE "WorkshopHours" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensMinute" INTEGER NOT NULL,
    "closesMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkshopHours_workshopId_idx" ON "WorkshopHours"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_workshopId_scheduledAt_key" ON "Appointment"("workshopId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workshop_googlePlaceId_key" ON "Workshop"("googlePlaceId");

-- AddForeignKey
ALTER TABLE "WorkshopHours" ADD CONSTRAINT "WorkshopHours_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

