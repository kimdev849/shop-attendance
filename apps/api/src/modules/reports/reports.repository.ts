import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Reports.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAttendanceReport(params: {
    from: Date;
    to: Date;
    shopId?: string;
    workerId?: string;
  }) {
    return this.prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: params.from, lte: params.to },
        shopId: params.shopId ?? undefined,
        workerId: params.workerId ?? undefined,
      },
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
        shop: { select: { id: true, name: true, code: true } },
        penalty: true,
      },
      orderBy: { attendanceDate: "desc" },
    });
  }

  async findPenaltyReport(params: {
    from: Date;
    to: Date;
    shopId?: string;
    status?: string;
  }) {
    return this.prisma.penalty.findMany({
      where: {
        createdAt: { gte: params.from, lte: params.to },
        status: params.status as any,
        worker: {
          shopId: params.shopId ?? undefined,
        },
      },
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
