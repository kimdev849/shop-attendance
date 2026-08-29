import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AttendanceService } from "./attendance.service";
import { CheckInDto } from "./dto/check-in.dto";
import { QueryAttendanceDto } from "./dto/query-attendance.dto";

@ApiTags("attendance")
@Controller({ path: "attendance", version: "1" })
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Point d'entrée principal utilisé par la tablette pour un pointage EN
   * LIGNE. Volontairement public (pas de JWT humain): la tablette s'identifie
   * via workerId + deviceId + biométrie locale confirmée, adaptée à un usage
   * "kiosque" partagé. Voir README §17 "Biométrie" pour le détail du modèle
   * de confiance retenu et ses limites.
   */
  @Public()
  @Post("check-in")
  checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  @Get()
  findAll(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER, UserRole.WORKER)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.attendanceService.findOne(id);
  }
}
