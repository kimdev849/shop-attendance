import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationType, UserRole } from "@prisma/client";
import { NotificationsRepository } from "./notifications.repository";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly repository: NotificationsRepository) {}

  async findAll(params: {
    userId: string;
    read?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { userId, read, page = 1, limit = 20 } = params;

    const where: any = { userId };
    if (read !== undefined) {
      where.readAt = read ? { not: null } : null;
    }

    const [data, total] = await Promise.all([
      this.repository.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.repository.count(where),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async countUnread(userId: string): Promise<number> {
    return this.repository.count({ userId, readAt: null });
  }

  async markAsRead(id: string, userId: string) {
    // Vérifier la propriété : un utilisateur ne peut marquer que ses propres notifications.
    const notification = await this.repository.findMany({ where: { id, userId }, take: 1 });
    if (notification.length === 0) {
      throw new NotFoundException("Notification introuvable.");
    }
    return this.repository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    return this.repository.markAllAsRead(userId);
  }

  /**
   * Émet une notification métier vers tous les utilisateurs ADMIN + SUPER_ADMIN.
   * Jamais bloquant : un échec est loggué mais ne fait pas échouer l'opération
   * métier appelante (pointage, absence, pénalité...).
   */
  async notifyAdmins(params: {
    type: NotificationType;
    title: string;
    message: string;
    entity?: string;
    entityId?: string;
  }): Promise<void> {
    try {
      const admins = await this.repository.findAdminUsers();
      if (admins.length === 0) return;
      await this.repository.createMany(
        admins.map((admin) => ({
          userId: admin.id,
          ...params,
        })),
      );
    } catch (err) {
      this.logger.warn(`Émission notification ignorée: ${err}`);
    }
  }
}
