import { Controller, Delete, Get, Param, Patch, Body, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DayOfWeek, UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { SchedulesService } from "./schedules.service";

@ApiTags("schedules")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller({ path: "schedules", version: "1" })
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findAll(
    @Query("workerId") workerId?: string,
    @Query("shopId") shopId?: string,
    @Query("dayOfWeek") dayOfWeek?: DayOfWeek,
  ) {
    return this.schedulesService.findAll({ workerId, shopId, dayOfWeek });
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findOne(@Param("id") id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedulesService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.schedulesService.remove(id);
  }
}
