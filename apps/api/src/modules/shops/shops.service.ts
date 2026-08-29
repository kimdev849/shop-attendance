import { Injectable, NotFoundException } from "@nestjs/common";
import { ShopStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ShopsRepository } from "./shops.repository";
import { CreateShopDto } from "./dto/create-shop.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";
import { ShopQueryParams } from "./types/shops.types";

@Injectable()
export class ShopsService {
  constructor(
    private readonly repository: ShopsRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateShopDto, actorUserId?: string) {
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new NotFoundException("Un shop avec ce code existe déjà.");
    }
    const shop = await this.repository.create(dto);
    await this.auditService.log({
      userId: actorUserId,
      action: "SHOP_CREATED",
      entity: "Shop",
      entityId: shop.id,
      metadata: { name: shop.name, code: shop.code },
    });
    return shop;
  }

  async findAll(params: ShopQueryParams) {
    const { search, status, page = 1, limit = 20, sortBy, sortOrder = 'asc' } = params;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const allowedSortFields: Record<string, any> = {
      name: { name: sortOrder },
      code: { code: sortOrder },
      status: { status: sortOrder },
      createdAt: { createdAt: sortOrder },
    };

    const orderBy = allowedSortFields[sortBy ?? ''] ?? { name: 'asc' };

    const [data, total] = await Promise.all([
      this.repository.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.repository.count(where),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const shop = await this.repository.findByIdWithRelations(id);
    if (!shop) throw new NotFoundException("Shop introuvable.");
    return shop;
  }

  async update(id: string, dto: UpdateShopDto, actorUserId?: string) {
    await this.ensureExists(id);
    const shop = await this.repository.update(id, dto);
    await this.auditService.log({
      userId: actorUserId,
      action: "SHOP_UPDATED",
      entity: "Shop",
      entityId: id,
      metadata: { name: shop.name, code: shop.code, ...dto },
    });
    return shop;
  }

  private async ensureExists(id: string) {
    const shop = await this.repository.findById(id);
    if (!shop) throw new NotFoundException("Shop introuvable.");
    return shop;
  }

  async getStats(id: string) {
    const shop = await this.repository.findById(id);
    if (!shop) throw new NotFoundException("Shop introuvable.");
    const workers = await this.repository.findMany({ where: { id } });
    return { shop, stats: { totalWorkers: workers.length } };
  }

  async activate(id: string, actorUserId?: string) {
    await this.ensureExists(id);
    const shop = await this.repository.update(id, { status: ShopStatus.ACTIVE });
    await this.auditService.log({
      userId: actorUserId,
      action: "SHOP_ACTIVATED",
      entity: "Shop",
      entityId: id,
      metadata: { name: shop.name, code: shop.code },
    });
    return shop;
  }

  async deactivate(id: string, actorUserId?: string) {
    await this.ensureExists(id);
    const shop = await this.repository.update(id, { status: ShopStatus.INACTIVE });
    await this.auditService.log({
      userId: actorUserId,
      action: "SHOP_DEACTIVATED",
      entity: "Shop",
      entityId: id,
      metadata: { name: shop.name, code: shop.code },
    });
    return shop;
  }
}
