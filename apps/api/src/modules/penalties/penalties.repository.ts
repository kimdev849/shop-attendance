import { Injectable } from "@nestjs/common";
import { PenaltyStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Penalties.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class PenaltiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.penalty.findUnique({
      where: { id },
      include: { worker: true, attendance: true },
    });
  }

  async findMany(params: {
    where: any;
    orderBy: any;
    skip: number;
    take: number;
  }) {
    return this.prisma.penalty.findMany({
      where: params.where,
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            shopId: true,
          },
        },
        attendance: true,
      },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where: any) {
    return this.prisma.penalty.count({ where });
  }

  async create(data: {
    workerId: string;
    attendanceId: string;
    amount: number;
    reason: string;
    status: string;
  }) {
    return this.prisma.penalty.create({
      data: {
        ...data,
        status: data.status as any,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.penalty.update({ where: { id }, data });
  }

  async findPendingRules() {
    return this.prisma.penaltyRule.findMany({
      orderBy: { fromMinutes: "asc" },
    });
  }

  async findPenaltyRuleById(id: string) {
    return this.prisma.penaltyRule.findUnique({ where: { id } });
  }

  async createPenaltyRule(data: {
    fromMinutes: number;
    toMinutes: number | null;
    amount: number;
    label?: string;
  }) {
    return this.prisma.penaltyRule.create({ data });
  }

  async updatePenaltyRule(id: string, data: any) {
    return this.prisma.penaltyRule.update({ where: { id }, data });
  }

  async deletePenaltyRule(id: string) {
    return this.prisma.penaltyRule.delete({ where: { id } });
  }
}
