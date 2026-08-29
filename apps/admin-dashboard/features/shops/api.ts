/**
 * Shops feature API calls.
 * All API interactions for the shops feature are centralized here.
 */
import { api } from "@/lib/api";

export interface Shop {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: string;
  _count?: {
    workers: number;
    devices: number;
  };
}

export interface PaginatedShops {
  data: Shop[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ShopListParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ShopFormData {
  name: string;
  code: string;
  address?: string;
  phone?: string;
}

export const shopsApi = {
  list: (params: ShopListParams) => api.shops.list(params as Record<string, string | number | undefined>),
  get: (id: string) => api.shops.get(id),
  create: (data: ShopFormData) => api.shops.create(data),
  update: (id: string, data: Partial<ShopFormData>) => api.shops.update(id, data),
};
