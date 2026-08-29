import { Injectable } from "@nestjs/common";
import { WorkerStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Workers.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class WorkersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployeeNumber(employeeNumber: string) {
    return this.prisma.worker.findUnique({ where: { employeeNumber } });
  }

  async findById(id: string) {
    return this.prisma.worker.findUnique({ where: { id } });
  }

  async findByIdWithRelations(id: string) {
    return this.prisma.worker.findUnique({
      where: { id },
      include: {
        shop: true,
        schedules: true,
        attendances: { orderBy: { attendanceDate: "desc" }, take: 20 },
        absences: { orderBy: { date: "desc" }, take: 20 },
        penalties: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { attendance: true },
        },
      },
    });
  }

  async findMany(params: {
    where: any;
    orderBy: any;
    skip: number;
    take: number;
  }) {
    return this.prisma.worker.findMany({
      where: params.where,
      include: { shop: { select: { id: true, name: true, code: true } } },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where: any) {
    return this.prisma.worker.count({ where });
  }

  async create(data: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    shopId?: string;
    position?: string;
    status?: WorkerStatus;
  }) {
    return this.prisma.worker.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.worker.update({ where: { id }, data });
  }

  async findActiveByShop(shopId: string) {
    return this.prisma.worker.findMany({
      where: { shopId, status: "ACTIVE" },
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    });
  }

  async findActiveByEmployeeNumberAndShop(employeeNumber: string, shopId: string) {
    return this.prisma.worker.findUnique({ where: { employeeNumber } });
  }

  async assignSchedule(workerId: string, dto: any, shopId: string) {
    return this.prisma.schedule.upsert({
      where: { workerId_dayOfWeek: { workerId, dayOfWeek: dto.dayOfWeek } },
      create: { ...dto, workerId, shopId },
      update: { ...dto },
    });
  }
}
