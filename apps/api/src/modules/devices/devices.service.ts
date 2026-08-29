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
    if (typeof params === "string") {
      return this.repository.findMany({ where: { shopId: params } });
    }
    const where: any = {};
    if (params?.shopId) where.shopId = params.shopId;
    return this.repository.findMany({ where });
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

  private async ensureExists(id: string) {
    const device = await this.repository.findById(id);
    if (!device) throw new NotFoundException("Tablette introuvable.");
    return device;
  }
}
