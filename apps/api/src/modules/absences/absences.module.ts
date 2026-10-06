import { Module } from "@nestjs/common";
import { AbsencesService } from "./absences.service";
import { AbsencesController } from "./absences.controller";
import { AbsencesRepository } from "./absences.repository";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AuditModule, NotificationsModule],
  providers: [AbsencesService, AbsencesRepository],
  controllers: [AbsencesController],
  exports: [AbsencesService],
})
export class AbsencesModule {}
