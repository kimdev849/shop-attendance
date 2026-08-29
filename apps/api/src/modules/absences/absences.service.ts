import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AbsencesRepository } from "./absences.repository";

@Injectable()
export class AbsencesService {
  constructor(
    private readonly repository: AbsencesRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(params: {
    search?: string;
    status?: string;
    workerId?: string;
    shopId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const { search, status, workerId, shopId, page = 1, limit = 20 } = params;

    const where: any = {};
    if (status) where.status = status;
    if (workerId) where.workerId = workerId;
    if (shopId) {
      where.worker = { shopId };
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

    const [data, total] = await Promise.all([
      this.repository.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.repository.count(where),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const absence = await this.repository.findById(id);
    if (!absence) throw new NotFoundException("Absence introuvable.");
    return absence;
  }

  async create(data: { workerId: string; date: Date | string; reason?: string }, actorUserId?: string) {
    const absence = await this.repository.create({
      workerId: data.workerId,
      date: typeof data.date === "string" ? new Date(data.date) : data.date,
      reason: data.reason,
    });
    await this.auditService.log({
      userId: actorUserId,
      action: "ABSENCE_CREATED",
      entity: "Absence",
      entityId: absence.id,
      metadata: { workerId: data.workerId, date: data.date },
    });
    return absence;
  }

  async validate(id: string, actorUserId: string) {
    const absence = await this.findOne(id);
    const updated = await this.repository.update(id, { status: "VALIDATED" });
    await this.auditService.log({
      userId: actorUserId,
      action: "ABSENCE_VALIDATED",
      entity: "Absence",
      entityId: id,
      metadata: { workerId: absence.workerId },
    });
    return updated;
  }

  async reject(id: string, actorUserId: string) {
    const absence = await this.findOne(id);
    const updated = await this.repository.update(id, { status: "REJECTED" });
    await this.auditService.log({
      userId: actorUserId,
      action: "ABSENCE_REJECTED",
      entity: "Absence",
      entityId: id,
      metadata: { workerId: absence.workerId },
    });
    return updated;
  }

  async update(id: string, dto: any, actorUserId?: string) {
    const absence = await this.findOne(id);
    const updated = await this.repository.update(id, dto);
    await this.auditService.log({
      userId: actorUserId,
      action: "ABSENCE_UPDATED",
      entity: "Absence",
      entityId: id,
      metadata: { workerId: absence.workerId, ...dto },
    });
    return updated;
  }
}
