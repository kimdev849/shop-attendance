-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "facePhoto" TEXT,
ADD COLUMN     "facePhotoSetAt" TIMESTAMP(3),
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinSetAt" TIMESTAMP(3);
