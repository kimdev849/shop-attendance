import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Audit logs.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async findMany(params: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: params.where,
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where?: any) {
    return this.prisma.auditLog.count({ where });
  }
}
