/**
 * Attendance feature API for tablet app.
 * Handles check-in and offline sync operations.
 */
import { api } from "@/services/api";

export interface CheckInPayload {
  workerId: string;
  shopId: string;
  deviceId: string;
  clientTimestamp: string;
  clientRequestId: string;
  biometricConfirmed: boolean;
}

export interface CheckInResult {
  attendanceId: string;
  workerFullName: string;
  checkInTime: string;
  scheduledTime: string | null;
  latenessMinutes: number;
  status: string;
  penaltyAmount: number | null;
  penaltyStatus: string | null;
}

export interface SyncAttendanceItem extends CheckInPayload {}

export interface SyncAttendanceResult {
  clientRequestId: string;
  status: "CREATED" | "DUPLICATE" | "ERROR";
  attendanceId?: string;
  error?: string;
}

export const attendanceFeatureApi = {
  checkIn: (payload: CheckInPayload) => api.post<CheckInResult>("/attendance/check-in", payload),
  sync: (items: SyncAttendanceItem[]) => api.post<SyncAttendanceResult[]>("/sync/attendance", { items }),
};
