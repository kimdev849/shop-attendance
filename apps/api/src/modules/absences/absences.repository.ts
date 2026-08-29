import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Absences.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class AbsencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.absence.findUnique({
      where: { id },
      include: {
        worker: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      },
    });
  }

  async findMany(params: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.absence.findMany({
      where: params.where,
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
      orderBy: params.orderBy ?? { date: "desc" },
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where?: any) {
    return this.prisma.absence.count({ where });
  }

  async create(data: {
    workerId: string;
    shopId?: string;
    date: Date;
    reason?: string;
    status?: string;
  }) {
    return this.prisma.absence.create({
      data: {
        workerId: data.workerId,
        shopId: data.shopId ?? "",
        date: data.date,
        reason: data.reason ?? null,
        status: (data.status ?? "PENDING") as any,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.absence.update({ where: { id }, data });
  }
}
