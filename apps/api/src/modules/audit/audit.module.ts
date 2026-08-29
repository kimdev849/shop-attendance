import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { AuditRepository } from "./audit.repository";

@Global()
@Module({
  providers: [AuditService, AuditRepository],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
