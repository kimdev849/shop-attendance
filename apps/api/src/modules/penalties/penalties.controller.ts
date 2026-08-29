import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PenaltyStatus, UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreatePenaltyRuleDto } from "./dto/create-penalty-rule.dto";
import { UpdatePenaltyRuleDto } from "./dto/update-penalty-rule.dto";
import { PenaltiesService } from "./penalties.service";
import { PenaltyRulesService } from "./penalty-rules.service";

@ApiTags("penalties")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller({ path: "penalties", version: "1" })
export class PenaltiesController {
  constructor(
    private readonly penaltiesService: PenaltiesService,
    private readonly penaltyRulesService: PenaltyRulesService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findAll(
    @Query("search") search?: string,
    @Query("status") status?: PenaltyStatus,
    @Query("workerId") workerId?: string,
    @Query("shopId") shopId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: 'asc' | 'desc',
  ) {
    return this.penaltiesService.findAll({
      search,
      status,
      workerId,
      shopId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findOne(@Param("id") id: string) {
    return this.penaltiesService.findOne(id);
  }

  @Patch(":id/approve")
  @Roles(UserRole.ADMIN)
  approve(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.penaltiesService.approve(id, userId);
  }

  @Patch(":id/reject")
  @Roles(UserRole.ADMIN)
  reject(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.penaltiesService.reject(id, userId);
  }

  @Patch(":id/cancel")
  @Roles(UserRole.ADMIN)
  cancel(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.penaltiesService.cancel(id, userId);
  }
}

@ApiTags("penalty-rules")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller({ path: "penalty-rules", version: "1" })
export class PenaltyRulesController {
  constructor(private readonly penaltyRulesService: PenaltyRulesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findAll() {
    return this.penaltyRulesService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreatePenaltyRuleDto) {
    return this.penaltyRulesService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdatePenaltyRuleDto) {
    return this.penaltyRulesService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.penaltyRulesService.remove(id);
  }
}
