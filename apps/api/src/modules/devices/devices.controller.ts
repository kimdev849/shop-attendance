import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import { DevicesService } from "./devices.service";

@ApiTags("devices")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller({ path: "devices", version: "1" })
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

  @Public()
  @Post(":id/heartbeat")
  heartbeat(@Param("id") id: string) {
    return this.devicesService.heartbeat(id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findAll(
    @Query("search") search?: string,
    @Query("shopId") shopId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.devicesService.findAll({
      search,
      shopId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findOne(@Param("id") id: string) {
    return this.devicesService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateDeviceDto) {
    return this.devicesService.update(id, dto);
  }
}
