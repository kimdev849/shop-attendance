/**
 * Attendance module types.
 * These are internal types used by the attendance module.
 * Shared types (used by frontend) are in packages/types/.
 */
import { AttendanceStatus, PenaltyStatus } from "@prisma/client";

export interface CheckInResult {
  attendanceId: string;
  workerFullName: string;
  checkInTime: Date;
  scheduledTime: Date | null;
  latenessMinutes: number;
  status: AttendanceStatus;
  penaltyAmount: number | null;
  penaltyStatus: PenaltyStatus | null;
}

export interface LatenessResult {
  isLate: boolean;
  retainedLatenessMinutes: number;
  rawLatenessMinutes: number;
}

export interface AttendanceQueryParams {
  shopId?: string;
  workerId?: string;
  status?: AttendanceStatus;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
