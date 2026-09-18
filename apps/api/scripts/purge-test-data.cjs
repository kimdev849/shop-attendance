/* Purge destructive des données métier de test.
 *
 * Garde : shops, devices, users (admins/managers), penalty_rules.
 * Supprime : penalties, attendances, absences, schedules, workers (+ audit_logs).
 *
 * Usage :
 *   DATABASE_URL=... node scripts/purge-test-data.cjs            → dry-run (comptes + aperçu)
 *   DATABASE_URL=... node scripts/purge-test-data.cjs --yes      → suppression réelle
 *
 * Ordre FK : penalties → attendances → absences → schedules → workers.
 * Les users liés à un worker (Worker.userId) sont détachés (userId=null)
 * avant suppression pour éviter les erreurs de clé étrangère.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const APPLY = process.argv.includes("--yes");

(async () => {
  console.log(APPLY ? "*** MODE APPLICATION (--yes) — SUPPRESSION RÉELLE ***" : "MODE DRY-RUN (aucune suppression — ajoutez --yes)");

  // Garde-fou : jamais sur la prod Render via ce script (URL impersonnelle).
  const url = process.env.DATABASE_URL || "";
  if (url.includes("onrender.com") || url.includes("render.com")) {
    console.error("REFUS: DATABASE_URL pointe vers Render. Utiliser une URL de base dédiée explicitement.");
    process.exit(1);
  }

  // ── Comptes avant ──
  const [workers, attendances, penalties, absences, schedules, shops, devices, users, rules, audits] = await Promise.all([
    prisma.worker.count(),
    prisma.attendance.count(),
    prisma.penalty.count(),
    prisma.absence.count(),
    prisma.schedule.count(),
    prisma.shop.count(),
    prisma.device.count(),
    prisma.user.count(),
    prisma.penaltyRule.count(),
    prisma.auditLog.count(),
  ]);

  console.log("\n=== ÉTAT ACTUEL ===");
  console.log(JSON.stringify(
    { workers, attendances, penalties, absences, schedules, shops, devices, users, penaltyRules: rules, auditLogs: audits },
    null,
    2,
  ));

  // Workers liés à un compte user (empêcherait la suppression FK) → détachement
  const workersWithUser = await prisma.worker.count({ where: { userId: { not: null } } });
  if (workersWithUser > 0) {
    console.log(`\nNOTE: ${workersWithUser} worker(s) lié(s) à un compte user (userId sera mis à NULL avant suppression).`);
  }

  // ── Suppression dans l'ordre des FK ──
  if (APPLY) {
    await prisma.$transaction([
      prisma.penalty.deleteMany({}),
      prisma.attendance.deleteMany({}),
      prisma.absence.deleteMany({}),
      prisma.schedule.deleteMany({}),
      prisma.worker.updateMany({ data: { userId: null } }),
      prisma.worker.deleteMany({}),
    ]);
    const purgedAudits = await prisma.auditLog.deleteMany({});
    console.log("\n=== SUPPRESSION EFFECTUÉE ===");
    console.log(`audit_logs purgés : ${purgedAudits.count}`);
  }

  // ── Comptes après / vérification ──
  const [w2, a2, p2, s2, d2, u2, r2] = await Promise.all([
    prisma.worker.count(),
    prisma.attendance.count(),
    prisma.penalty.count(),
    prisma.shop.count(),
    prisma.device.count(),
    prisma.user.count(),
    prisma.penaltyRule.count(),
  ]);
  console.log("\n=== APRÈS ===");
  console.log(`workers=${w2} attendances=${a2} penalties=${p2}`);
  console.log(`\n=== PRÉSERVATION (shops/devices/users intacts) ===`);
  console.log(`shops=${s2} (avant ${shops}) | devices=${d2} (avant ${devices}) | users=${u2} (avant ${users}) | penaltyRules=${r2} (avant ${rules})`);
  const intact = s2 === shops && d2 === devices && u2 === users && r2 === rules;
  console.log(intact ? "✔ Shops/devices/users/penaltyRules intacts." : "✘ DIFFÉRENCE DÉTECTÉE sur les données préservées !");

  // ── Aperçu (dry-run uniquement) ──
  if (!APPLY) {
    const last = await prisma.attendance.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, clientRequestId: true, createdAt: true },
    });
    console.log("\nAperçu des 3 derniers pointages qui seraient supprimés :");
    for (const a of last) console.log(`  ${a.createdAt.toISOString()} | ${a.clientRequestId ?? "(sans id)"}`);
    console.log("\n→ Pour appliquer : relancer avec --yes");
  }
})()
  .catch((e) => { console.error("ERREUR:", e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
