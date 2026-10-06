import { Injectable } from "@nestjs/common";
import { NotificationType, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Notifications.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    where?: Prisma.NotificationWhereInput;
    orderBy?: Prisma.NotificationOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.notification.findMany({
      where: params.where,
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where?: Prisma.NotificationWhereInput) {
    return this.prisma.notification.count({ where });
  }

  /** Destinataires des notifications métier : ADMIN + SUPER_ADMIN (support). */
  async findAdminUsers() {
    return this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }, isActive: true },
      select: { id: true },
    });
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    entity?: string;
    entityId?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  /**
   * Crée la même notification pour plusieurs destinataires en une requête.
   * Utilisé pour notifier tous les ADMINs d'un événement métier.
   */
  async createMany(data: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    entity?: string;
    entityId?: string;
  }>) {
    if (data.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({ data });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
