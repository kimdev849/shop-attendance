import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AbsenceStatus, UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AbsencesService } from "./absences.service";
import { CreateAbsenceDto } from "./dto/create-absence.dto";
import { UpdateAbsenceDto } from "./dto/update-absence.dto";

@ApiTags("absences")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller({ path: "absences", version: "1" })
export class AbsencesController {
  constructor(private readonly absencesService: AbsencesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  create(@Body() dto: CreateAbsenceDto, @CurrentUser("userId") userId: string) {
    return this.absencesService.create(dto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findAll(
    @Query("search") search?: string,
    @Query("shopId") shopId?: string,
    @Query("workerId") workerId?: string,
    @Query("status") status?: AbsenceStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: 'asc' | 'desc',
  ) {
    return this.absencesService.findAll({
      search,
      shopId,
      workerId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findOne(@Param("id") id: string) {
    return this.absencesService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateAbsenceDto) {
    return this.absencesService.update(id, dto);
  }

  @Patch(":id/validate")
  @Roles(UserRole.ADMIN)
  validate(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.absencesService.validate(id, userId);
  }

  @Patch(":id/reject")
  @Roles(UserRole.ADMIN)
  reject(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.absencesService.reject(id, userId);
  }
}
