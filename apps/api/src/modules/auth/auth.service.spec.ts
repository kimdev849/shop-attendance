import { UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";

jest.mock("argon2");

describe("AuthService", () => {
  let authService: AuthService;
  let prisma: any;
  let jwtService: any;
  let auditService: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue("signed.jwt.token") };
    auditService = { log: jest.fn() };
    authService = new AuthService(prisma, jwtService, auditService);
  });

  describe("validateUser", () => {
    it("rejette un email inconnu", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(authService.validateUser("nobody@x.com", "pass")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejette un utilisateur désactivé", async () => {
      prisma.user.findUnique.mockResolvedValue({ isActive: false });
      await expect(authService.validateUser("a@x.com", "pass")).rejects.toThrow(UnauthorizedException);
    });

    it("rejette un mot de passe incorrect", async () => {
      prisma.user.findUnique.mockResolvedValue({ isActive: true, passwordHash: "hash" });
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      await expect(authService.validateUser("a@x.com", "wrong")).rejects.toThrow(UnauthorizedException);
    });

    it("retourne l'utilisateur si les identifiants sont corrects", async () => {
      const user = { id: "u1", isActive: true, passwordHash: "hash", email: "a@x.com", role: "ADMIN" };
      prisma.user.findUnique.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser("a@x.com", "correct");
      expect(result).toEqual(user);
    });
  });

  describe("login", () => {
    it("émet un access token et un refresh token pour des identifiants valides", async () => {
      const user = { id: "u1", isActive: true, passwordHash: "hash", email: "a@x.com", role: "ADMIN" };
      prisma.user.findUnique.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login("a@x.com", "correct");

      expect(result.accessToken).toBe("signed.jwt.token");
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({ id: "u1", email: "a@x.com", role: "ADMIN" });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "LOGIN", userId: "u1" }),
      );
    });
  });

  describe("refresh", () => {
    it("rejette un refresh token expiré", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(authService.refresh("expired-token")).rejects.toThrow(UnauthorizedException);
    });

    it("rejette un refresh token révoqué", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });
      await expect(authService.refresh("revoked-token")).rejects.toThrow(UnauthorizedException);
    });
  });
});
