import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";

// Chaque utilisateur ne voit que ses propres notifications (userId du JWT).
// L'authentification est assurée par le JwtAuthGuard global (APP_GUARD).
@ApiTags("notifications")
@ApiBearerAuth()
@Controller({ path: "notifications", version: "1" })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser("userId") userId: string,
    @Query("read") read?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.notificationsService.findAll({
      userId,
      read: read === undefined || read === "" ? undefined : read === "true",
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("unread-count")
  countUnread(@CurrentUser("userId") userId: string) {
    return this.notificationsService.countUnread(userId);
  }

  @Patch("read-all")
  markAllAsRead(@CurrentUser("userId") userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }
}
