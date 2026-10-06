import { UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";

jest.mock("argon2");

describe("AuthService", () => {
  let authService: AuthService;
  let repository: Record<string, jest.Mock>;
  let jwtService: any;
  let auditService: any;

  beforeEach(() => {
    repository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      createUser: jest.fn(),
      createRefreshToken: jest.fn().mockResolvedValue({}),
      findRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn().mockResolvedValue({}),
      revokeRefreshTokensByHash: jest.fn().mockResolvedValue({ count: 1 }),
      revokeAllRefreshTokensForUser: jest.fn().mockResolvedValue({ count: 0 }),
      updateUserPassword: jest.fn().mockResolvedValue({}),
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue("signed.jwt.token") };
    auditService = { log: jest.fn() };
    authService = new AuthService(
      repository as unknown as AuthRepository,
      jwtService,
      auditService,
    );
  });

  describe("validateUser", () => {
    it("rejette un email inconnu", async () => {
      repository.findUserByEmail.mockResolvedValue(null);
      await expect(authService.validateUser("nobody@x.com", "pass")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejette un utilisateur désactivé", async () => {
      repository.findUserByEmail.mockResolvedValue({ isActive: false });
      await expect(authService.validateUser("a@x.com", "pass")).rejects.toThrow(UnauthorizedException);
    });

    it("rejette un mot de passe incorrect", async () => {
      repository.findUserByEmail.mockResolvedValue({ isActive: true, passwordHash: "hash" });
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      await expect(authService.validateUser("a@x.com", "wrong")).rejects.toThrow(UnauthorizedException);
    });

    it("retourne l'utilisateur si les identifiants sont corrects", async () => {
      const user = { id: "u1", isActive: true, passwordHash: "hash", email: "a@x.com", role: "ADMIN" };
      repository.findUserByEmail.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser("a@x.com", "correct");
      expect(result).toEqual(user);
    });
  });

  describe("login", () => {
    it("émet un access token et un refresh token pour des identifiants valides", async () => {
      const user = { id: "u1", isActive: true, passwordHash: "hash", email: "a@x.com", role: "ADMIN" };
      repository.findUserByEmail.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await authService.login("a@x.com", "correct");

      expect(result.accessToken).toBe("signed.jwt.token");
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({ id: "u1", email: "a@x.com", role: "ADMIN" });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "LOGIN", userId: "u1" }),
      );
      // Le refresh token est persisté hashé via le repository.
      expect(repository.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1", expiresAt: expect.any(Date) }),
      );
    });
  });

  describe("refresh", () => {
    it("rejette un refresh token expiré", async () => {
      repository.findRefreshToken.mockResolvedValue({
        id: "rt-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(authService.refresh("expired-token")).rejects.toThrow(UnauthorizedException);
    });

    it("rejette un refresh token révoqué", async () => {
      repository.findRefreshToken.mockResolvedValue({
        id: "rt-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });
      await expect(authService.refresh("revoked-token")).rejects.toThrow(UnauthorizedException);
    });
  });
});
