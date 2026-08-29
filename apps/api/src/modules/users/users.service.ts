import { Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { UsersRepository } from "./users.repository";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.repository.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
    });
    return { id: user.id, email: user.email, role: user.role };
  }

  async findAll(params: { search?: string; role?: string; page?: number; limit?: number }) {
    const { search, role, page = 1, limit = 20 } = params;
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    const [data, total] = await Promise.all([
      this.repository.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.repository.count(where),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException("Utilisateur introuvable.");
    return { id: user.id, email: user.email, role: user.role };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);
    const updateData: any = { ...dto };
    if ((dto as any).password) {
      updateData.passwordHash = await argon2.hash((dto as any).password);
      delete updateData.password;
    }
    const user = await this.repository.update(id, updateData);
    return { id: user.id, email: user.email, role: user.role };
  }

  private async ensureExists(id: string) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException("Utilisateur introuvable.");
    return user;
  }

  async activate(id: string) {
    await this.ensureExists(id);
    const user = await this.repository.update(id, { isActive: true });
    return { id: user.id, email: user.email, role: user.role };
  }

  async deactivate(id: string) {
    await this.ensureExists(id);
    const user = await this.repository.update(id, { isActive: false });
    return { id: user.id, email: user.email, role: user.role };
  }
}
