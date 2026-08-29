/**
 * Attendance module constants.
 */

/** Default tolerance in minutes if no schedule is configured */
export const DEFAULT_TOLERANCE_MINUTES = 10;

/** Maximum number of attendance records per worker per day */
export const MAX_ATTENDANCE_PER_DAY = 1;

/** Sync status values */
export const SYNC_STATUS = {
  SYNCED: "SYNCED",
  PENDING: "PENDING",
  FAILED: "FAILED",
} as const;
