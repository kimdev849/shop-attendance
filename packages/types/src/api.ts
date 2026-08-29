/**
 * API response types shared between Dashboard and Tablet app.
 * These define the standard API response format.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalShops: number;
  totalWorkers: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  totalPenaltiesAmountPending: number;
  totalPenaltiesAmountApproved: number;
}
