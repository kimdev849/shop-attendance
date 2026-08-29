import { Injectable } from "@nestjs/common";

/**
 * Repository responsible for Notifications.
 * NOTE: Notification model not yet defined in Prisma schema.
 * This is a stub implementation.
 */
@Injectable()
export class NotificationsRepository {
  async findMany(params: { where?: any; orderBy?: any; skip?: number; take?: number }) {
    // Stub: return empty array until Notification model is added to schema
    return [];
  }

  async create(data: { userId: string; title: string; message: string; type?: string }) {
    // Stub: log notification creation until model exists
    console.log("Notification created:", data);
    return { id: "stub", ...data, createdAt: new Date() };
  }

  async markAsRead(id: string) {
    // Stub: no-op until model exists
    return { id, readAt: new Date() };
  }
}
