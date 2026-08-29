/**
 * Types partagés entre apps/api, apps/admin-dashboard et apps/tablet-app.
 * Garder ce package sans dépendance runtime (uniquement des types).
 * 
 * Architecture: chaque domaine a son propre fichier dans packages/types/src/.
 * Ce fichier ré-exporte tout pour la compatibilité.
 */

// Worker domain
export * from "./worker";

// Attendance domain
export * from "./attendance";

// Penalty domain
export * from "./penalty";

// Shop domain
export * from "./shop";

// Device domain
export * from "./device";

// API response types
export * from "./api";

// Re-export Prisma enums for convenience
export { DayOfWeek } from "@prisma/client";
export { AbsenceStatus } from "@prisma/client";
