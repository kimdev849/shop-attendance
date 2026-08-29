/**
 * Penalties feature API calls.
 * All API interactions for the penalties feature are centralized here.
 */
import { api } from "@/lib/api";

export interface Penalty {
  id: string;
  workerId: string;
  attendanceId: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    shopId: string;
  };
  attendance?: {
    latenessMinutes: number;
    attendanceDate: string;
  };
}

export interface PaginatedPenalties {
  data: Penalty[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PenaltyListParams {
  search?: string;
  status?: string;
  workerId?: string;
  shopId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const penaltiesApi = {
  list: (params: PenaltyListParams) => api.penalties.list(params as Record<string, string | number | undefined>),
  approve: (id: string) => api.penalties.approve(id),
  reject: (id: string) => api.penalties.reject(id),
  cancel: (id: string) => api.penalties.cancel(id),
};
