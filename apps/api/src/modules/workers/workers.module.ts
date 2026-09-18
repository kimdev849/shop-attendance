import { Module } from "@nestjs/common";
import { WorkersService } from "./workers.service";
import { WorkersController } from "./workers.controller";
import { WorkersRepository } from "./workers.repository";
// désactivé — flux simplifié avec mot de passe, code gardé au cas où
// import { FaceRecognitionService } from "./face-recognition.service";
import { CheckInPhotoService } from "./check-in-photo.service";
import { CheckInPhotoCleanupService } from "./check-in-photo-cleanup.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  providers: [
    WorkersService,
    WorkersRepository,
    // désactivé — flux simplifié avec mot de passe, code gardé au cas où
    // FaceRecognitionService,
    CheckInPhotoService,
    CheckInPhotoCleanupService,
  ],
  controllers: [WorkersController],
  exports: [WorkersService, CheckInPhotoService],
})
export class WorkersModule {}
