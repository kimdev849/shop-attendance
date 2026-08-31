import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { WorkerStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuditService } from "../audit/audit.service";
import { WorkersRepository } from "./workers.repository";
import { CreateWorkerDto } from "./dto/create-worker.dto";
import { UpdateWorkerDto } from "./dto/update-worker.dto";
import { AssignScheduleDto } from "./dto/assign-schedule.dto";
import { WorkerLookupResult, PinVerificationResult, WorkerRosterItem } from "./types/workers.types";

@Injectable()
export class WorkersService {
  constructor(
    private readonly repository: WorkersRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateWorkerDto, actorUserId?: string) {
    const existing = await this.repository.findByEmployeeNumber(dto.employeeNumber);
    if (existing) {
      throw new ConflictException("Un travailleur avec ce matricule existe deja.");
    }
    const worker = await this.repository.create(dto);
    await this.auditService.log({
      userId: actorUserId,
      action: "WORKER_CREATED",
      entity: "Worker",
      entityId: worker.id,
      metadata: { employeeNumber: dto.employeeNumber },
    });
    return worker;
  }

  async findAll(params: {
    search?: string;
    shopId?: string;
    status?: WorkerStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { search, shopId, status, page = 1, limit = 20, sortBy, sortOrder = 'asc' } = params;

    const where = {
      shopId: shopId ?? undefined,
      status: status ?? undefined,
      OR: search
        ? [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { employeeNumber: { contains: search, mode: 'insensitive' as const } },
            { position: { contains: search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };

    const allowedSortFields: Record<string, any> = {
      lastName: { lastName: sortOrder },
      firstName: { firstName: sortOrder },
      employeeNumber: { employeeNumber: sortOrder },
      status: { status: sortOrder },
      createdAt: { createdAt: sortOrder },
    };

    const orderBy = allowedSortFields[sortBy ?? ''] ?? [{ lastName: 'asc' }, { firstName: 'asc' }];

    const [data, total] = await Promise.all([
      this.repository.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.repository.count(where),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const worker = await this.repository.findByIdWithRelations(id);
    if (!worker) throw new NotFoundException("Travailleur introuvable.");
    return worker;
  }

  async update(id: string, dto: UpdateWorkerDto, actorUserId?: string) {
    await this.ensureExists(id);
    const worker = await this.repository.update(id, dto);
    await this.auditService.log({
      userId: actorUserId,
      action: "WORKER_UPDATED",
      entity: "Worker",
      entityId: id,
      metadata: {
        employeeNumber: worker.employeeNumber,
        firstName: worker.firstName,
        lastName: worker.lastName,
        ...dto,
      },
    });
    return worker;
  }

  async setStatus(id: string, status: WorkerStatus, actorUserId?: string) {
    await this.ensureExists(id);
    const worker = await this.repository.update(id, { status });
    await this.auditService.log({
      userId: actorUserId,
      action: `WORKER_STATUS_${status}`,
      entity: "Worker",
      entityId: id,
      metadata: {
        employeeNumber: worker.employeeNumber,
        firstName: worker.firstName,
        lastName: worker.lastName,
      },
    });
    return worker;
  }

  async assignSchedule(workerId: string, dto: AssignScheduleDto, actorUserId?: string) {
    const worker = await this.ensureExists(workerId);
    if (!worker.shopId) {
      throw new ConflictException(
        "Le travailleur doit d'abord etre affecte a un shop avant de recevoir un horaire.",
      );
    }

    // Schedule upsert is handled by the schedules module
    // This is a cross-module operation that stays in the service
    const schedule = await this.repository.assignSchedule(workerId, dto, worker.shopId);

    await this.auditService.log({
      userId: actorUserId,
      action: "WORKER_SCHEDULE_ASSIGNED",
      entity: "Schedule",
      entityId: schedule.id,
      metadata: {
        employeeNumber: worker.employeeNumber,
        firstName: worker.firstName,
        lastName: worker.lastName,
        dayOfWeek: dto.dayOfWeek,
      },
    });

    return schedule;
  }

  private async ensureExists(id: string) {
    const worker = await this.repository.findById(id);
    if (!worker) throw new NotFoundException("Travailleur introuvable.");
    return worker;
  }

  // --- Lookup tablette ---

  async lookupForCheckIn(employeeNumber: string, shopId: string): Promise<WorkerLookupResult | null> {
    const worker = await this.repository.findByEmployeeNumber(employeeNumber);
    if (!worker || worker.status !== "ACTIVE" || worker.shopId !== shopId) {
      return null;
    }
    return {
      id: worker.id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      employeeNumber: worker.employeeNumber,
      hasPin: !!worker.pinHash,
      hasFacePhoto: !!worker.facePhoto,
    };
  }

  async rosterForShop(shopId: string, search?: string): Promise<WorkerRosterItem[]> {
    return this.repository.findActiveByShop(shopId, search);
  }

  // --- Mot de passe personnel ---

  async setPin(id: string, pin: string, actorUserId?: string) {
    await this.ensureExists(id);
    if (!pin || pin.length < 4) {
      throw new BadRequestException("Le mot de passe doit contenir au moins 4 caracteres.");
    }
    const pinHash = await bcrypt.hash(pin, 10);
    const worker = await this.repository.update(id, { pinHash, pinSetAt: new Date() });
    await this.auditService.log({
      userId: actorUserId,
      action: "WORKER_PIN_SET",
      entity: "Worker",
      entityId: id,
      metadata: {
        employeeNumber: worker.employeeNumber,
        firstName: worker.firstName,
        lastName: worker.lastName,
      },
    });
    return { success: true };
  }

  async verifyPin(employeeNumber: string, shopId: string, pin: string): Promise<PinVerificationResult> {
    const worker = await this.repository.findByEmployeeNumber(employeeNumber);
    if (!worker || worker.status !== "ACTIVE" || worker.shopId !== shopId) {
      throw new BadRequestException("Travailleur introuvable ou inactif.");
    }
    if (!worker.pinHash) {
      throw new BadRequestException("Aucun mot de passe defini pour ce travailleur. Contactez l'administrateur.");
    }
    const match = await bcrypt.compare(pin, worker.pinHash);
    if (!match) {
      throw new BadRequestException("Mot de passe incorrect.");
    }
    return {
      verified: true,
      workerId: worker.id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      employeeNumber: worker.employeeNumber,
    };
  }

  async resetPin(id: string, actorUserId?: string) {
    const worker = await this.ensureExists(id);
    await this.repository.update(id, { pinHash: null, pinSetAt: null });
    await this.auditService.log({
      userId: actorUserId,
      action: "WORKER_PIN_RESET",
      entity: "Worker",
      entityId: id,
      metadata: {
        employeeNumber: worker.employeeNumber,
        firstName: worker.firstName,
        lastName: worker.lastName,
      },
    });
    return { success: true };
  }

  // --- Photo faciale (Face ID) ---

  async setFacePhoto(id: string, facePhoto: string, actorUserId?: string, faceDescriptor?: string) {
    await this.ensureExists(id);
    await this.repository.update(id, { facePhoto, facePhotoSetAt: new Date(), ...(faceDescriptor !== undefined ? { faceDescriptor } : {}) });
    await this.auditService.log({
      userId: actorUserId,
      action: "WORKER_FACE_SET",
      entity: "Worker",
      entityId: id,
      metadata: {
        employeeNumber: (await this.repository.findById(id))?.employeeNumber,
        firstName: (await this.repository.findById(id))?.firstName,
        lastName: (await this.repository.findById(id))?.lastName,
      },
    });
    return { success: true };
  }

  async getFacePhoto(id: string) {
    const worker = await this.repository.findById(id);
    if (!worker || !worker.facePhoto) return null;
    return { facePhoto: worker.facePhoto };
  }

  async getFacePhotoByEmployeeNumber(employeeNumber: string, shopId: string) {
    const worker = await this.repository.findByEmployeeNumber(employeeNumber);
    if (!worker || worker.status !== "ACTIVE" || worker.shopId !== shopId || !worker.facePhoto) {
      return null;
    }
    return { facePhoto: worker.facePhoto, faceDescriptor: worker.faceDescriptor };
  }

  async removeFacePhoto(id: string, actorUserId?: string) {
    await this.ensureExists(id);
    await this.repository.update(id, { facePhoto: null, facePhotoSetAt: null, faceDescriptor: null });
    await this.auditService.log({
      userId: actorUserId,
      action: "WORKER_FACE_REMOVED",
      entity: "Worker",
      entityId: id,
      metadata: {
        employeeNumber: (await this.repository.findById(id))?.employeeNumber,
        firstName: (await this.repository.findById(id))?.firstName,
        lastName: (await this.repository.findById(id))?.lastName,
      },
    });
    return { success: true };
  }
}
