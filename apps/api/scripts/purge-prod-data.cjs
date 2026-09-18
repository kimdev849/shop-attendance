/* Purge destructive des données métier de test — VARIANTE PRODUCTION.
 *
 * Même logique que purge-test-data.cjs mais conçue pour la base Render :
 *   - refuse de tourner sans DATABASE_URL explicite passé en argument 1
 *     (jamais depuis apps/api/.env, qui est un environnement local) ;
 *   - refuse les URL localhost ;
 *   - exige --yes pour supprimer.
 *
 * Garde : shops, devices, users (admins/managers), penalty_rules.
 * Supprime : penalties, attendances, absences, schedules, workers, audit_logs.
 *
 * Usage :
 *   node scripts/purge-prod-data.cjs "<DATABASE_URL_RENDER>"            → dry-run
 *   node scripts/purge-prod-data.cjs "<DATABASE_URL_RENDER>" --yes      → suppression
 */
const { PrismaClient } = require("@prisma/client");

const RAW_URL = process.argv[2] || "";
const APPLY = process.argv.includes("--yes");

(async () => {
  if (!RAW_URL) {
    console.error("Usage: node scripts/purge-prod-data.cjs \"<DATABASE_URL_RENDER>\" [--yes]");
    process.exit(1);
  }
  if (/localhost|127\.0\.0\.1/.test(RAW_URL)) {
    console.error("REFUS: URL locale détectée — utiliser scripts/purge-test-data.cjs pour le local.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: RAW_URL } } });

  try {
    console.log(APPLY ? "*** PROD — MODE APPLICATION (--yes) — SUPPRESSION RÉELLE ***" : "PROD — MODE DRY-RUN (aucune suppression — ajoutez --yes)");

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

    console.log("\n=== ÉTAT ACTUEL (PROD) ===");
    console.log(JSON.stringify(
      { workers, attendances, penalties, absences, schedules, shops, devices, users, penaltyRules: rules, auditLogs: audits },
      null,
      2,
    ));

    // Détail des photos d'audit encore référencées (Cloudinary) avant suppression
    const withPhoto = await prisma.attendance.count({ where: { checkInPhotoUrl: { not: null } } });
    if (withPhoto > 0) {
      console.log(`\nNOTE: ${withPhoto} pointage(s) référencent une photo Cloudinary (audit).`);
      console.log("Les URLs seront perdues avec les lignes attendances. Purge Cloudinary facultative séparée");
      console.log("(dossier shop-attendance/check-in-photos — possible via script dédié si CLOUDINARY_* fournis).");
    }

    const workersWithUser = await prisma.worker.count({ where: { userId: { not: null } } });
    if (workersWithUser > 0) {
      console.log(`\nNOTE: ${workersWithUser} worker(s) lié(s) à un compte user (userId sera mis à NULL avant suppression).`);
    }

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
      console.log("\n=== SUPPRESSION EFFECTUÉE (PROD) ===");
      console.log(`audit_logs purgés : ${purgedAudits.count}`);
    }

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
    console.log(`\n=== PRÉSERVATION ===`);
    console.log(`shops=${s2} (avant ${shops}) | devices=${d2} (avant ${devices}) | users=${u2} (avant ${users}) | penaltyRules=${r2} (avant ${rules})`);
    const intact = s2 === shops && d2 === devices && u2 === users && r2 === rules;
    console.log(intact ? "✔ Shops/devices/users/penaltyRules intacts." : "✘ DIFFÉRENCE DÉTECTÉE sur les données préservées !");
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => { console.error("ERREUR:", e.message); process.exitCode = 1; });
