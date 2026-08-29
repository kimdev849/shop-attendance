import { Injectable } from "@nestjs/common";
import { AuditRepository } from "./audit.repository";

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async log(params: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: any;
  }) {
    return this.repository.create(params);
  }

  async findAll(params: {
    userId?: string;
    action?: string;
    entity?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, action, entity, page = 1, limit = 50 } = params;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [data, total] = await Promise.all([
      this.repository.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.repository.count(where),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
