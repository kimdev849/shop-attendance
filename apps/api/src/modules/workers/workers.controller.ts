import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole, WorkerStatus } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AssignScheduleDto } from "./dto/assign-schedule.dto";
import { CreateWorkerDto } from "./dto/create-worker.dto";
import { UpdateWorkerDto } from "./dto/update-worker.dto";
import { WorkersService } from "./workers.service";

@ApiTags("workers")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller({ path: "workers", version: "1" })
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  /**
   * Endpoint public et restreint utilisé par la tablette (écran
   * d'identification). Doit rester déclaré AVANT la route ":id" ci-dessous
   * pour que "lookup" ne soit pas interprété comme un identifiant.
   */
  @Public()
  @Get("lookup")
  lookupForCheckIn(@Query("employeeNumber") employeeNumber: string, @Query("shopId") shopId: string) {
    return this.workersService.lookupForCheckIn(employeeNumber, shopId);
  }

  /**
   * Utilisé par la tablette pour rafraîchir son cache local hors ligne
   * (voir services/worker-cache.ts côté apps/tablet-app). Doit rester
   * déclaré AVANT la route ":id".
   */
  @Public()
  @Get("roster")
  rosterForShop(@Query("shopId") shopId: string, @Query("search") search?: string) {
    return this.workersService.rosterForShop(shopId, search);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  create(@Body() dto: CreateWorkerDto, @CurrentUser("userId") userId: string) {
    return this.workersService.create(dto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  findAll(
    @Query("search") search?: string,
    @Query("shopId") shopId?: string,
    @Query("status") status?: WorkerStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: 'asc' | 'desc',
  ) {
    return this.workersService.findAll({
      search,
      shopId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER, UserRole.WORKER)
  findOne(@Param("id") id: string) {
    return this.workersService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateWorkerDto, @CurrentUser("userId") userId: string) {
    return this.workersService.update(id, dto, userId);
  }

  @Patch(":id/activate")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  activate(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.workersService.setStatus(id, WorkerStatus.ACTIVE, userId);
  }

  @Patch(":id/deactivate")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  deactivate(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.workersService.setStatus(id, WorkerStatus.INACTIVE, userId);
  }

  @Post(":id/schedules")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  assignSchedule(
    @Param("id") id: string,
    @Body() dto: AssignScheduleDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.workersService.assignSchedule(id, dto, userId);
  }

  // --- Mot de passe personnel (empreinte) ---

  @Patch(":id/set-pin")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  setPin(
    @Param("id") id: string,
    @Body("pin") pin: string,
    @CurrentUser("userId") userId: string,
  ) {
    return this.workersService.setPin(id, pin, userId);
  }

  @Patch(":id/reset-pin")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  resetPin(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.workersService.resetPin(id, userId);
  }

  @Public()
  @Post("verify-pin")
  verifyPin(
    @Body("employeeNumber") employeeNumber: string,
    @Body("shopId") shopId: string,
    @Body("pin") pin: string,
  ) {
    return this.workersService.verifyPin(employeeNumber, shopId, pin);
  }

  // --- Face photo ---

  @Patch(":id/face-photo")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  setFacePhoto(
    @Param("id") id: string,
    @Body("facePhoto") facePhoto: string,
    @Body("faceDescriptor") faceDescriptor: string | undefined,
    @CurrentUser("userId") userId: string,
  ) {
    return this.workersService.setFacePhoto(id, facePhoto, userId, faceDescriptor);
  }

  @Get(":id/face-photo")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  getFacePhoto(@Param("id") id: string) {
    return this.workersService.getFacePhoto(id);
  }

  @Public()
  @Post("verify-face")
  verifyFace(
    @Body("employeeNumber") employeeNumber: string,
    @Body("shopId") shopId: string,
    @Body("capturedPhoto") capturedPhoto: string,
  ) {
    return this.workersService.verifyFace(employeeNumber, shopId, capturedPhoto);
  }

  @Public()
  @Post("face-photo-for-checkin")
  getFacePhotoForCheckIn(
    @Body("employeeNumber") employeeNumber: string,
    @Body("shopId") shopId: string,
  ) {
    return this.workersService.getFacePhotoByEmployeeNumber(employeeNumber, shopId);
  }

  @Patch(":id/remove-face-photo")
  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
  removeFacePhoto(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.workersService.removeFacePhoto(id, userId);
  }
}
