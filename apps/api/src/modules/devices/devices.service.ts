import { Injectable, NotFoundException } from "@nestjs/common";
import { DevicesRepository } from "./devices.repository";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";

@Injectable()
export class DevicesService {
  constructor(private readonly repository: DevicesRepository) {}

  async create(dto: CreateDeviceDto) {
    return this.repository.create(dto);
  }

  async findAll(params?: string | { search?: string; shopId?: string; status?: string; page?: number; limit?: number }) {
    // Auto-mark stale devices before listing
    await this.repository.markStaleDevicesOffline();

    if (typeof params === "string") {
      return this.repository.findMany({ where: { shopId: params } });
    }
    const { page = 1, limit = 20 } = params ?? {};
    const where: any = {};
    if (params?.shopId) where.shopId = params.shopId;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { deviceIdentifier: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params?.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.repository.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.repository.count(where),
    ]);

    // Compute isStale for each device (no heartbeat in 5 min)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const enriched = data.map((d: any) => ({
      ...d,
      isStale: d.status === "ONLINE" && (!d.lastHeartbeatAt || d.lastHeartbeatAt < fiveMinAgo),
    }));

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const device = await this.repository.findById(id);
    if (!device) throw new NotFoundException("Tablette introuvable.");
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto) {
    await this.ensureExists(id);
    return this.repository.update(id, dto);
  }

  async touch(id: string) {
    return this.repository.touchLastSeen(id);
  }

  async heartbeat(id: string) {
    return this.repository.heartbeat(id);
  }

  private async ensureExists(id: string) {
    const device = await this.repository.findById(id);
    if (!device) throw new NotFoundException("Tablette introuvable.");
    return device;
  }
}
