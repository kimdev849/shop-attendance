import { Module } from "@nestjs/common";
import { DevicesService } from "./devices.service";
import { DevicesController } from "./devices.controller";
import { DevicesRepository } from "./devices.repository";

@Module({
  providers: [DevicesService, DevicesRepository],
  controllers: [DevicesController],
  exports: [DevicesService],
})
export class DevicesModule {}
