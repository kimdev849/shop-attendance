import { Injectable } from "@nestjs/common";
import { ShopStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Shops.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class ShopsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.shop.findUnique({ where: { id } });
  }

  async findByIdWithRelations(id: string) {
    return this.prisma.shop.findUnique({
      where: { id },
      include: {
        workers: true,
        devices: true,
      },
    });
  }

  async findMany(params: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.shop.findMany({
      where: params.where,
      include: {
        _count: { select: { workers: true, devices: true } },
      },
      orderBy: params.orderBy ?? { name: "asc" },
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where?: any) {
    return this.prisma.shop.count({ where });
  }

  async create(data: { name: string; code: string; address?: string; phone?: string }) {
    return this.prisma.shop.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.shop.update({ where: { id }, data });
  }

  async findByCode(code: string) {
    return this.prisma.shop.findUnique({ where: { code } });
  }
}
