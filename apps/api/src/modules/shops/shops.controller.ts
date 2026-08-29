import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ShopStatus, UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateShopDto } from "./dto/create-shop.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";
import { ShopsService } from "./shops.service";

@ApiTags("shops")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller({ path: "shops", version: "1" })
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateShopDto, @CurrentUser("userId") userId: string) {
    return this.shopsService.create(dto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findAll(
    @Query("search") search?: string,
    @Query("status") status?: ShopStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: 'asc' | 'desc',
  ) {
    return this.shopsService.findAll({
      search,
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
    return this.shopsService.findOne(id);
  }

  @Get(":id/stats")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  getStats(@Param("id") id: string) {
    return this.shopsService.getStats(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateShopDto, @CurrentUser("userId") userId: string) {
    return this.shopsService.update(id, dto, userId);
  }

  @Patch(":id/activate")
  @Roles(UserRole.ADMIN)
  activate(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.shopsService.activate(id, userId);
  }

  @Patch(":id/deactivate")
  @Roles(UserRole.ADMIN)
  deactivate(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.shopsService.deactivate(id, userId);
  }
}
