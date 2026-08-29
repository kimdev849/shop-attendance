import { Module } from "@nestjs/common";
import { ShopsService } from "./shops.service";
import { ShopsController } from "./shops.controller";
import { ShopsRepository } from "./shops.repository";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  providers: [ShopsService, ShopsRepository],
  controllers: [ShopsController],
  exports: [ShopsService],
})
export class ShopsModule {}
