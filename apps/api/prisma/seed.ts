/* eslint-disable no-console */
// @ts-nocheck — seed script, types resolved at runtime by Prisma Client
import { PrismaClient, DayOfWeek } from "@prisma/client";
import * as argon2 from "argon2";
import * as bcrypt from "bcryptjs";
import { DEFAULT_PENALTY_TIERS, DEFAULT_TOLERANCE_MINUTES } from "@shop-attendance/config";

const prisma = new PrismaClient();

const WEEKDAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayOfWeekFromDate(date: Date): DayOfWeek {
  const days: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];
  return days[date.getDay()];
}

async function main() {
  console.log("Seeding database...");

  // --- Paliers de pénalité par défaut ---------------------------------
  const existingRules = await prisma.penaltyRule.count();
  if (existingRules === 0) {
    for (const tier of DEFAULT_PENALTY_TIERS) {
      await prisma.penaltyRule.create({
        data: { fromMinutes: tier.fromMinutes, toMinutes: tier.toMinutes, amount: tier.amount },
      });
    }
    console.log(`Created ${DEFAULT_PENALTY_TIERS.length} penalty rules.`);
  }

  // --- Administrateur ---------------------------------------------------
  const adminPasswordHash = await argon2.hash("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@shopattendance.local" },
    update: {},
    create: {
      email: "admin@shopattendance.local",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin user ready: ${admin.email} / Admin123!`);

  // --- Shops --------------------------------------------------------------
  const shopSeeds = [
    { name: "Shop Centre", code: "SHP-CENTRE", city: "Brazzaville", address: "Avenue de la Paix" },
    { name: "Shop Talangaï", code: "SHP-TALANGAI", city: "Brazzaville", address: "Rue Talangaï 12" },
    { name: "Shop Bacongo", code: "SHP-BACONGO", city: "Brazzaville", address: "Marché Total, Bacongo" },
    { name: "Shop Poto-Poto", code: "SHP-POTOPOTO", city: "Brazzaville", address: "Avenue Poto-Poto" },
  ];

  const shops = [];
  for (const s of shopSeeds) {
    const shop = await prisma.shop.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
    shops.push(shop);
  }
  console.log(`Created/verified ${shops.length} shops.`);

  // --- Tablettes (une par shop) -------------------------------------------
  for (const shop of shops) {
    await prisma.device.upsert({
      where: { deviceIdentifier: `TABLET-${shop.code}` },
      update: {},
      create: {
        deviceIdentifier: `TABLET-${shop.code}`,
        name: `Tablette ${shop.name}`,
        shopId: shop.id,
        appVersion: "1.0.0",
        status: "ONLINE",
        lastSyncAt: new Date(),
      },
    });
  }
  console.log("Created/verified devices.");

  // --- Travailleurs (au moins 10) ------------------------------------------
  const firstNames = [
    "Jean", "Marie", "Paul", "Grace", "Divine", "Serge", "Blandine", "Fabrice",
    "Ornella", "Christian", "Prisca", "Rodrigue",
  ];
  const lastNames = [
    "Dupont", "Mabiala", "Nkounkou", "Loemba", "Moussavou", "Bikindou", "Malonga",
    "Samba", "Itoua", "Makosso", "Ondongo", "Tati",
  ];
  const positions = ["Vendeur", "Caissier", "Superviseur", "Magasinier"];

  const workers = [];
  const defaultPinHash = await bcrypt.hash("1234", 10);
  for (let i = 0; i < 12; i++) {
    const shop = shops[i % shops.length];
    const employeeNumber = `EMP-${String(1000 + i)}`;
    const worker = await prisma.worker.upsert({
      where: { employeeNumber },
      update: { pinHash: defaultPinHash, pinSetAt: new Date() },
      create: {
        employeeNumber,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        phone: `+2420${String(600000000 + i * 137)}`,
        position: positions[i % positions.length],
        shopId: shop.id,
        status: "ACTIVE",
        pinHash: defaultPinHash,
        pinSetAt: new Date(),
      },
    });
    workers.push(worker);
  }
  console.log(`Created/verified ${workers.length} workers. (default PIN: 1234)`);

  // --- Horaires (08:00 - 17:00, tolérance par défaut, du lundi au samedi) --
  for (const worker of workers) {
    for (const day of WEEKDAYS) {
      await prisma.schedule.upsert({
        where: { workerId_dayOfWeek: { workerId: worker.id, dayOfWeek: day } },
        update: {},
        create: {
          workerId: worker.id,
          shopId: worker.shopId!,
          dayOfWeek: day,
          startTime: "08:00",
          endTime: "17:00",
          toleranceMinutes: DEFAULT_TOLERANCE_MINUTES,
        },
      });
    }
  }
  console.log("Created/verified schedules.");

  // --- Pointages de démonstration (7 derniers jours) -----------------------
  const activePenaltyRules = await prisma.penaltyRule.findMany({ orderBy: { fromMinutes: "asc" } });

  function computePenalty(retainedMinutes: number) {
    if (retainedMinutes <= 0) return 0;
    const tier = activePenaltyRules.find(
      (t: { fromMinutes: number; toMinutes: number | null; amount: number }) =>
        retainedMinutes >= t.fromMinutes && (t.toMinutes === null || retainedMinutes <= t.toMinutes),
    );
    return tier?.amount ?? activePenaltyRules[activePenaltyRules.length - 1]?.amount ?? 0;
  }

  let attendanceCount = 0;
  let penaltyCount = 0;

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - dayOffset);
    const attendanceDate = dateOnly(day);
    const dow = dayOfWeekFromDate(attendanceDate);
    if (!WEEKDAYS.includes(dow)) continue; // pas de pointage le dimanche

    for (const worker of workers) {
      // ~85% de présence, parmi lesquels ~25% en retard, reste absent
      const roll = Math.random();
      if (roll > 0.85) continue; // absent, pas de pointage (peut donner lieu à une Absence)

      const scheduled = new Date(attendanceDate);
      scheduled.setUTCHours(8, 0, 0, 0);

      const isLate = Math.random() < 0.25;
      const lateOffsetMinutes = isLate ? 15 + Math.floor(Math.random() * 40) : Math.floor(Math.random() * 8);
      const checkInTime = new Date(scheduled);
      checkInTime.setUTCMinutes(checkInTime.getUTCMinutes() + lateOffsetMinutes);

      const rawLateness = Math.max(0, lateOffsetMinutes);
      const retainedLateness = Math.max(0, rawLateness - DEFAULT_TOLERANCE_MINUTES);
      const status = retainedLateness > 0 ? "LATE" : "ON_TIME";

      const device = await prisma.device.findUnique({
        where: { deviceIdentifier: `TABLET-${shops.find((s) => s.id === worker.shopId)?.code}` },
      });

      try {
        const attendance = await prisma.attendance.create({
          data: {
            workerId: worker.id,
            shopId: worker.shopId!,
            deviceId: device?.id,
            attendanceDate,
            scheduledTime: scheduled,
            checkInTime,
            latenessMinutes: retainedLateness,
            status,
            syncStatus: "SYNCED",
            clientRequestId: `seed-${worker.employeeNumber}-${attendanceDate.toISOString().slice(0, 10)}`,
          },
        });
        attendanceCount++;

        if (status === "LATE") {
          const amount = computePenalty(retainedLateness);
          if (amount > 0) {
            await prisma.penalty.create({
              data: {
                workerId: worker.id,
                attendanceId: attendance.id,
                amount,
                reason: `Retard de ${retainedLateness} minute(s) retenue(s).`,
                status: Math.random() < 0.5 ? "PENDING" : "APPROVED",
                approvedBy: Math.random() < 0.5 ? admin.id : undefined,
                approvedAt: Math.random() < 0.5 ? new Date() : undefined,
              },
            });
            penaltyCount++;
          }
        }
      } catch {
        // Duplicate from a previous seed run, ignore.
      }
    }
  }
  console.log(`Created ~${attendanceCount} attendance records and ~${penaltyCount} penalties.`);

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
