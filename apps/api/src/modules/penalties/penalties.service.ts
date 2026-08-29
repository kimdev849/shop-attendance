import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PenaltyStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PenaltiesRepository } from "./penalties.repository";
import { PenaltyQueryParams } from "./types/penalties.types";

@Injectable()
export class PenaltiesService {
  constructor(
    private readonly repository: PenaltiesRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(params: PenaltyQueryParams) {
    const { search, status, workerId, shopId, page = 1, limit = 20, sortBy, sortOrder = 'desc' } = params;

    const where: any = {
      status: status ?? undefined,
      workerId: workerId ?? undefined,
    };

    if (shopId) {
      where.worker = { ...where.worker, shopId };
    }

    if (search) {
      where.worker = {
        ...where.worker,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeNumber: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const allowedSortFields: Record<string, any> = {
      createdAt: { createdAt: sortOrder },
      amount: { amount: sortOrder },
      status: { status: sortOrder },
    };

    const orderBy = allowedSortFields[sortBy ?? ''] ?? { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.repository.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.repository.count(where),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const penalty = await this.repository.findById(id);
    if (!penalty) throw new NotFoundException("Pénalité introuvable.");
    return penalty;
  }

  async approve(id: string, actorUserId: string) {
    const penalty = await this.findOne(id);
    if (penalty.status !== PenaltyStatus.PENDING) {
      throw new BadRequestException("Seule une pénalité EN ATTENTE peut être approuvée.");
    }
    const updated = await this.repository.update(id, {
      status: PenaltyStatus.APPROVED,
      approvedBy: actorUserId,
      approvedAt: new Date(),
    });
    await this.auditService.log({
      userId: actorUserId,
      action: "PENALTY_APPROVED",
      entity: "Penalty",
      entityId: id,
      metadata: {
        amount: penalty.amount,
        employeeNumber: (penalty as any).worker?.employeeNumber,
        firstName: (penalty as any).worker?.firstName,
        lastName: (penalty as any).worker?.lastName,
      },
    });
    return updated;
  }

  async reject(id: string, actorUserId: string) {
    const penalty = await this.findOne(id);
    if (penalty.status !== PenaltyStatus.PENDING) {
      throw new BadRequestException("Seule une pénalité EN ATTENTE peut être rejetée.");
    }
    const updated = await this.repository.update(id, {
      status: PenaltyStatus.REJECTED,
      approvedBy: actorUserId,
      approvedAt: new Date(),
    });
    await this.auditService.log({
      userId: actorUserId,
      action: "PENALTY_REJECTED",
      entity: "Penalty",
      entityId: id,
      metadata: {
        amount: penalty.amount,
        employeeNumber: (penalty as any).worker?.employeeNumber,
        firstName: (penalty as any).worker?.firstName,
        lastName: (penalty as any).worker?.lastName,
      },
    });
    return updated;
  }

  async cancel(id: string, actorUserId: string) {
    const penalty = await this.findOne(id);
    if (penalty.status === PenaltyStatus.CANCELLED) {
      throw new BadRequestException("Cette pénalité est déjà annulée.");
    }
    const updated = await this.repository.update(id, {
      status: PenaltyStatus.CANCELLED,
    });
    await this.auditService.log({
      userId: actorUserId,
      action: "PENALTY_CANCELLED",
      entity: "Penalty",
      entityId: id,
      metadata: {
        amount: penalty.amount,
        employeeNumber: (penalty as any).worker?.employeeNumber,
        firstName: (penalty as any).worker?.firstName,
        lastName: (penalty as any).worker?.lastName,
      },
    });
    return updated;
  }
}
