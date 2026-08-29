import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: "audit-logs", version: "1" })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @Query("entity") entity?: string,
    @Query("action") action?: string,
    @Query("userId") userId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.auditService.findAll({
      entity,
      action,
      userId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
