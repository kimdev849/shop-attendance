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
  latenessMinutes: number;
  status: string;
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
  };
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
