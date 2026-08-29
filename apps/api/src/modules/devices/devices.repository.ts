import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Devices.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class DevicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.device.findUnique({ where: { id } });
  }

  async findByShopId(shopId: string) {
    return this.prisma.device.findMany({ where: { shopId } });
  }

  async findMany(params: { where?: any; orderBy?: any }) {
    return this.prisma.device.findMany({
      where: params.where,
      include: { shop: { select: { id: true, name: true, code: true } } },
      orderBy: params.orderBy ?? { createdAt: "desc" },
    });
  }

  async create(data: { name: string; shopId: string; serialNumber?: string; deviceIdentifier?: string }) {
    return this.prisma.device.create({
      data: {
        name: data.name,
        shopId: data.shopId,
        deviceIdentifier: data.deviceIdentifier ?? data.serialNumber ?? "unknown",
        status: "OFFLINE" as any,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.device.update({ where: { id }, data });
  }

  async touchLastSeen(id: string) {
    return this.prisma.device.update({
      where: { id },
      data: { lastSyncAt: new Date(), status: "ONLINE" as any },
    });
  }
}
