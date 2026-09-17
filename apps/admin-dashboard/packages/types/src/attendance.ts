/**
 * Attendance-related types shared between API, Dashboard, and Tablet app.
 * These are pure types with no runtime dependencies.
 */

export enum AttendanceStatus {
  ON_TIME = "ON_TIME",
  LATE = "LATE",
  ABSENT = "ABSENT",
}

export enum SyncStatus {
  SYNCED = "SYNCED",
  PENDING = "PENDING",
  FAILED = "FAILED",
}

export interface CheckInPayload {
  workerId: string;
  shopId: string;
  deviceId: string;
  clientTimestamp: string; // ISO 8601
  clientRequestId: string; // idempotency key, generated on the device
  biometricConfirmed: boolean;
  type?: "CHECK_IN" | "CHECK_OUT"; // Auto-detected by server if omitted
}

export interface CheckInResult {
  attendanceId: string;
  workerFullName: string;
  checkInTime: string;
  checkOutTime: string | null;
  scheduledTime: string | null;
  latenessMinutes: number;
  status: AttendanceStatus;
  penaltyAmount: number | null;
  penaltyStatus: PenaltyStatus | null;
  type: "CHECK_IN" | "CHECK_OUT";
}

export interface SyncAttendanceItem extends CheckInPayload {
  // Same shape as an online check-in; the client just replays queued items.
}

export interface SyncAttendanceResult {
  clientRequestId: string;
  status: "CREATED" | "DUPLICATE" | "ERROR";
  attendanceId?: string;
  error?: string;
}

export interface Attendance {
  id: string;
  workerId: string;
  shopId: string;
  deviceId: string;
  attendanceDate: Date;
  scheduledTime: Date | null;
  checkInTime: Date;
  latenessMinutes: number;
  status: AttendanceStatus;
  syncStatus: SyncStatus;
  clientRequestId: string;
  createdAt: Date;
}

// Import PenaltyStatus from penalty.ts to avoid circular dependencies
import { PenaltyStatus } from "./penalty";
