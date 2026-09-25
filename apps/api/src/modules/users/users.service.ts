import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import { UsersRepository } from "./users.repository";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

/** Infos minimales de l'appelant, issues du JWT (décorateur @CurrentUser). */
export interface Actor {
  userId: string;
  role: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  /**
   * Le compte SUPER_ADMIN (support/vendeur) est invisible et intouchable
   * pour les ADMIN : ni listé, ni consultable, ni modifiable, ni désactivable.
   * Seul un SUPER_ADMIN peut gérer un autre SUPER_ADMIN.
   */
  private isSuperAdminViewer(actor?: Actor) {
    return actor?.role === UserRole.SUPER_ADMIN;
  }

  private async ensureTargetManageable(id: string, actor?: Actor) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException("Utilisateur introuvable.");
    if (user.role === UserRole.SUPER_ADMIN && !this.isSuperAdminViewer(actor)) {
      // 404 et non 403 : le compte n'est pas censé exister aux yeux d'un ADMIN.
      throw new NotFoundException("Utilisateur introuvable.");
    }
    return user;
  }

  async create(dto: CreateUserDto, actor?: Actor) {
    if (dto.role === UserRole.SUPER_ADMIN && !this.isSuperAdminViewer(actor)) {
      throw new ForbiddenException("Vous n'avez pas les permissions nécessaires pour cette action.");
    }
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

    // SUPER_ADMIN exclu de la liste (invisible), sauf filtre explicite d'un
    // SUPER_ADMIN lui-même via l'API.
    if (role === UserRole.SUPER_ADMIN) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    where.role = { not: UserRole.SUPER_ADMIN };
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

  async findOne(id: string, actor?: Actor) {
    const user = await this.ensureTargetManageable(id, actor);
    return { id: user.id, email: user.email, role: user.role };
  }

  async update(id: string, dto: UpdateUserDto, actor?: Actor) {
    await this.ensureTargetManageable(id, actor);
    if (dto.role === UserRole.SUPER_ADMIN && !this.isSuperAdminViewer(actor)) {
      // Personne ne peut s'auto-promouvoir ni promouvoir un compte en SUPER_ADMIN.
      throw new ForbiddenException("Vous n'avez pas les permissions nécessaires pour cette action.");
    }
    const updateData: any = { ...dto };
    if ((dto as any).password) {
      updateData.passwordHash = await argon2.hash((dto as any).password);
      delete updateData.password;
    }
    const user = await this.repository.update(id, updateData);
    return { id: user.id, email: user.email, role: user.role };
  }

  async activate(id: string, actor?: Actor) {
    await this.ensureTargetManageable(id, actor);
    const user = await this.repository.update(id, { isActive: true });
    return { id: user.id, email: user.email, role: user.role };
  }

  async deactivate(id: string, actor?: Actor) {
    await this.ensureTargetManageable(id, actor);
    const user = await this.repository.update(id, { isActive: false });
    return { id: user.id, email: user.email, role: user.role };
  }
}
