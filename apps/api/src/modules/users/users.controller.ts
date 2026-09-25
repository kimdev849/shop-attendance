import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService, Actor } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: Actor) {
    return this.usersService.create(dto, actor);
  }

  @Get()
  findAll(
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.usersService.findAll({
      search,
      role,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() actor: Actor) {
    return this.usersService.findOne(id, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: Actor) {
    return this.usersService.update(id, dto, actor);
  }

  @Patch(":id/activate")
  activate(@Param("id") id: string, @CurrentUser() actor: Actor) {
    return this.usersService.activate(id, actor);
  }

  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string, @CurrentUser() actor: Actor) {
    return this.usersService.deactivate(id, actor);
  }
}
