/**
 * Attendance feature API calls.
 * All API interactions for the attendance feature are centralized here.
 */
import { api } from "@/lib/api";

export interface Attendance {
  id: string;
  workerId: string;
  shopId: string;
  deviceId: string;
  attendanceDate: string;
  scheduledTime: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  latenessMinutes: number;
  status: string;
  /** URL Cloudinary de la photo de pointage (audit, expire sous 28 jours) — null si absente/expirée. */
  checkInPhotoUrl: string | null;
  /** Date d'expiration de la photo d'audit (28 jours après le check-in). */
  checkInPhotoExpiresAt: string | null;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  shop: {
    id: string;
    name: string;
    code: string;
  };
  device: {
    id: string;
    name: string;
  } | null;
  penalty?: any;
}

export interface PaginatedAttendances {
  data: Attendance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendanceListParams {
  search?: string;
  from?: string;
  to?: string;
  shopId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const attendanceApi = {
  list: (params: AttendanceListParams) => api.attendance.list(params as Record<string, string | number | undefined>),
  get: (id: string) => api.attendance.get(id),
};
