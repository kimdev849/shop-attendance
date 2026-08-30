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

  async count(where?: any) {
    return this.prisma.device.count({ where });
  }

  async findMany(params: { where?: any; orderBy?: any; skip?: number; take?: number }) {
    return this.prisma.device.findMany({
      where: params.where,
      include: { shop: { select: { id: true, name: true, code: true } } },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    });
  }

  async create(data: { name: string; shopId: string; serialNumber?: string; deviceIdentifier?: string }) {
    const identifier = data.deviceIdentifier ?? data.serialNumber ?? `TAB-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.device.create({
      data: {
        name: data.name,
        shopId: data.shopId,
        deviceIdentifier: identifier,
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
      data: { lastSyncAt: new Date(), lastHeartbeatAt: new Date(), status: "ONLINE" as any },
    });
  }

  async heartbeat(id: string) {
    return this.prisma.device.update({
      where: { id },
      data: { lastHeartbeatAt: new Date(), status: "ONLINE" as any },
    });
  }

  /**
   * Mark devices as OFFLINE if no heartbeat received in the last 5 minutes.
   * Called periodically or before listing devices.
   */
  async markStaleDevicesOffline() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.prisma.device.updateMany({
      where: {
        status: "ONLINE",
        lastHeartbeatAt: { lt: fiveMinAgo },
      },
      data: { status: "INACTIVE" as any },
    });
  }
}
