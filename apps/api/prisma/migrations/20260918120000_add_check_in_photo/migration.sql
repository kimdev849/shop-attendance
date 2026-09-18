-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "checkInPhotoUrl" TEXT,
ADD COLUMN     "checkInPhotoExpiresAt" TIMESTAMP(3);
