import { ShopsService } from "./shops.service";

describe("ShopsService", () => {
  let service: ShopsService;
  let repository: any;
  let auditService: any;

  beforeEach(() => {
    repository = {
      findByCode: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findByIdWithRelations: jest.fn(),
      update: jest.fn(),
    };
    auditService = { log: jest.fn() };
    service = new ShopsService(repository, auditService);
  });

  it("crée un shop avec les champs fournis et journalise l'action", async () => {
    const dto = { name: "Shop Centre", code: "SHP-CENTRE", city: "Brazzaville" };
    repository.findByCode.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: "s1", ...dto });

    const result = await service.create(dto as any, "admin-1");

    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: "s1", ...dto });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SHOP_CREATED", metadata: { name: dto.name, code: dto.code } }),
    );
  });

  it("filtre les shops par recherche insensible à la casse", async () => {
    repository.findMany.mockResolvedValue([]);
    repository.count.mockResolvedValue(0);
    await service.findAll({ search: "centre" });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: { contains: "centre", mode: "insensitive" } }),
          ]),
        }),
      }),
    );
  });
});
