import { Module } from "@nestjs/common";
import { WorkersService } from "./workers.service";
import { WorkersController } from "./workers.controller";
import { WorkersRepository } from "./workers.repository";
import { FaceRecognitionService } from "./face-recognition.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  providers: [WorkersService, WorkersRepository, FaceRecognitionService],
  controllers: [WorkersController],
  exports: [WorkersService],
})
export class WorkersModule {}
