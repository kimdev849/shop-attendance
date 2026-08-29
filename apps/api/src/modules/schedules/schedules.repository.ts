import { Injectable } from "@nestjs/common";
import { DayOfWeek } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Schedules.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class SchedulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    workerId?: string;
    shopId?: string;
    dayOfWeek?: DayOfWeek;
  }) {
    return this.prisma.schedule.findMany({
      where: {
        workerId: params.workerId ?? undefined,
        shopId: params.shopId ?? undefined,
        dayOfWeek: params.dayOfWeek ?? undefined,
      },
      include: {
        worker: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        shop: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  async findById(id: string) {
    return this.prisma.schedule.findUnique({ where: { id } });
  }

  async findApplicable(workerId: string, dayOfWeek: DayOfWeek) {
    return this.prisma.schedule.findUnique({
      where: { workerId_dayOfWeek: { workerId, dayOfWeek } },
    });
  }

  async upsert(data: {
    workerId: string;
    shopId: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    toleranceMinutes?: number;
  }) {
    return this.prisma.schedule.upsert({
      where: {
        workerId_dayOfWeek: {
          workerId: data.workerId,
          dayOfWeek: data.dayOfWeek,
        },
      },
      create: data,
      update: {
        startTime: data.startTime,
        endTime: data.endTime,
        toleranceMinutes: data.toleranceMinutes,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.schedule.delete({ where: { id } });
  }
}
