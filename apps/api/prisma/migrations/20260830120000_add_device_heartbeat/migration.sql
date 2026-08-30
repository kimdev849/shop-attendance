-- AlterTable: Add lastHeartbeatAt to devices
ALTER TABLE "devices" ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3);

-- CreateIndex for fast stale-device queries
CREATE INDEX "devices_lastHeartbeatAt_idx" ON "devices"("lastHeartbeatAt");
