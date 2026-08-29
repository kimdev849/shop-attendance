import { Module } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { SyncRepository } from "./sync.repository";
import { AttendanceModule } from "../attendance/attendance.module";
import { DevicesModule } from "../devices/devices.module";

@Module({
  imports: [AttendanceModule, DevicesModule],
  providers: [SyncService, SyncRepository],
  controllers: [SyncController],
})
export class SyncModule {}
