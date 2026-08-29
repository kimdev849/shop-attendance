/**
 * Shops module types.
 * These are internal types used by the shops module.
 * Shared types (used by frontend) are in packages/types/.
 */
import { ShopStatus } from "@prisma/client";

export interface ShopQueryParams {
  search?: string;
  status?: ShopStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ShopWithCounts {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: ShopStatus;
  _count: {
    workers: number;
    devices: number;
  };
}
