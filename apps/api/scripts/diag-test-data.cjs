/* Diagnostic lecture seule — aucun write. */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  // ── 1. 15 derniers pointages (le plus récent d'abord) ──
  const last = await prisma.attendance.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { worker: { select: { firstName: true, lastName: true, employeeNumber: true } } },
  });
  console.log("=== 15 DERNIERS POINTAGES (createdAt desc) ===");
  if (last.length === 0) console.log("(aucune ligne dans attendances)");
  for (const a of last) {
    console.log(
      [
        a.createdAt.toISOString(),
        `date=${a.attendanceDate.toISOString().slice(0, 10)}`,
        `in=${a.checkInTime.toISOString()}`,
        `worker=${a.worker.firstName} ${a.worker.lastName} (${a.worker.employeeNumber})`,
        `workerId=${a.workerId}`,
        `shopId=${a.shopId}`,
        `deviceId=${a.deviceId ?? "null"}`,
        `sync=${a.syncStatus}`,
        `photo=${a.checkInPhotoUrl ? "oui" : "non"}`,
        `req=${a.clientRequestId ?? "null"}`,
      ].join(" | ")
    );
  }

  // ── 2. Comptages globaux ──
  const counts = {};
  for (const t of ["worker", "attendance", "penalty", "absence", "schedule", "shop", "device", "user", "penaltyRule", "auditLog"]) {
    counts[t] = await prisma[t].count();
  }
  console.log("\n=== COMPTAGES GLOBAUX ===");
  console.log(JSON.stringify(counts, null, 2));

  // ── 3. Répartition par shop ──
  const shops = await prisma.shop.findMany({ select: { id: true, name: true, code: true } });
  console.log("\n=== PAR MAGASIN ===");
  for (const s of shops) {
    const [w, a, p, ab] = await Promise.all([
      prisma.worker.count({ where: { shopId: s.id } }),
      prisma.attendance.count({ where: { shopId: s.id } }),
      prisma.penalty.count({ where: { worker: { shopId: s.id } } }),
      prisma.absence.count({ where: { shopId: s.id } }),
    ]);
    console.log(`${s.name} (${s.code}) ${s.id} : workers=${w} attendances=${a} penalties=${p} absences=${ab}`);
  }

  // ── 4. Intégrité : relation shop obligatoire → pas d'orphelins possibles (FK). ──
})()
  .catch((e) => { console.error("ERREUR:", e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
