-- CreateEnum
CREATE TYPE "WorkshopRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "workshopRole" "WorkshopRole";

-- CreateTable
CREATE TABLE "WorkshopInvite" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopInvite_token_key" ON "WorkshopInvite"("token");

-- CreateIndex
CREATE INDEX "WorkshopInvite_token_idx" ON "WorkshopInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopInvite_workshopId_email_key" ON "WorkshopInvite"("workshopId", "email");

-- AddForeignKey
ALTER TABLE "WorkshopInvite" ADD CONSTRAINT "WorkshopInvite_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopInvite" ADD CONSTRAINT "WorkshopInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
