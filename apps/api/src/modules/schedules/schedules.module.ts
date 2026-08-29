import { Module } from "@nestjs/common";
import { SchedulesService } from "./schedules.service";
import { SchedulesController } from "./schedules.controller";
import { SchedulesRepository } from "./schedules.repository";

@Module({
  providers: [SchedulesService, SchedulesRepository],
  controllers: [SchedulesController],
  exports: [SchedulesService],
})
export class SchedulesModule {}
