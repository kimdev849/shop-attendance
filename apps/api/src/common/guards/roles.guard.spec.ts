import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  function createContext(userRole: string | undefined, requiredRoles: UserRole[] = [UserRole.ADMIN]) {
    const request = { user: userRole ? { userId: "u1", email: "a@x.com", role: userRole } : undefined };
    const handler = { name: "handler" };
    const reflector = {
      getAllAndOverride: jest.fn((_key: string, _targets: unknown[]) => requiredRoles),
    };
    const context: any = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
      getClass: () => handler,
    };
    return { guard: new RolesGuard(reflector as any), reflector, context };
  }

  it("laisse passer un ADMIN sur une route ADMIN", () => {
    const { guard, context } = createContext("ADMIN");
    expect(guard.canActivate(context)).toBe(true);
  });

  it("laisse passer un SUPER_ADMIN sur une route ADMIN (hiérarchie)", () => {
    const { guard, context } = createContext("SUPER_ADMIN");
    expect(guard.canActivate(context)).toBe(true);
  });

  it("laisse passer un SUPER_ADMIN même sur une route WORKER-only", () => {
    const { guard, context } = createContext("SUPER_ADMIN", [UserRole.WORKER]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejette un SHOP_MANAGER sur une route ADMIN", () => {
    const { guard, context } = createContext("SHOP_MANAGER");
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("rejette un utilisateur sans rôle", () => {
    const { guard, context } = createContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("laisse passer quand aucune route n'exige de rôle", () => {
    const { guard, context } = createContext("SHOP_MANAGER", []);
    expect(guard.canActivate(context)).toBe(true);
  });
});
