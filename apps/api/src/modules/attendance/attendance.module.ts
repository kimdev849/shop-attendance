import { Module } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { AttendanceController } from "./attendance.controller";
import { AttendanceRepository } from "./attendance.repository";
import { AuditModule } from "../audit/audit.module";
import { DevicesModule } from "../devices/devices.module";
import { SchedulesModule } from "../schedules/schedules.module";
import { PenaltiesModule } from "../penalties/penalties.module";

@Module({
  imports: [AuditModule, DevicesModule, SchedulesModule, PenaltiesModule],
  providers: [AttendanceService, AttendanceRepository],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
