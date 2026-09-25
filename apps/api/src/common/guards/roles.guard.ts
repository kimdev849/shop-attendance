import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Vérifie que l'utilisateur authentifié possède l'un des rôles requis par la
 * route (RBAC). Utilisé conjointement avec @Roles(...) et JwtAuthGuard.
 *
 * Hiérarchie : SUPER_ADMIN hérite de toutes les permissions ADMIN et passe
 * donc toutes les routes, sans avoir à l'ajouter dans chaque @Roles(...).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !this.hasRequiredRole(user.role, requiredRoles)) {
      throw new ForbiddenException("Vous n'avez pas les permissions nécessaires pour cette action.");
    }
    return true;
  }

  private hasRequiredRole(role: string | undefined, requiredRoles: UserRole[]): boolean {
    if (!role) return false;
    // SUPER_ADMIN > ADMIN : un SUPER_ADMIN satisfait toute route ADMIN.
    if (role === UserRole.SUPER_ADMIN) return true;
    return requiredRoles.includes(role as UserRole);
  }
}
