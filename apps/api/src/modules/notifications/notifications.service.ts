import { Injectable } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async findAll(params: {
    userId?: string;
    read?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { userId, read, page = 1, limit = 20 } = params;

    const where: any = {};
    if (userId) where.userId = userId;
    if (read !== undefined) {
      where.readAt = read ? { not: null } : null;
    }

    return this.repository.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async create(data: { userId: string; title: string; message: string; type?: string }) {
    return this.repository.create(data);
  }

  async markAsRead(id: string) {
    return this.repository.markAsRead(id);
  }
}
