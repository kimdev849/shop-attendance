/**
 * Workers feature API calls.
 * All API interactions for the workers feature are centralized here.
 */
import { api } from "@/lib/api";

export interface Worker {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  position?: string;
  pinHash?: string | null;
  pinSetAt?: string | null;
  facePhoto?: string | null;
  facePhotoSetAt?: string | null;
  status: string;
  shop?: { id: string; name: string } | null;
}

export interface PaginatedWorkers {
  data: Worker[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkerListParams {
  search?: string;
  shopId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface WorkerFormData {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
  email: string;
  shopId: string;
}

export const workersApi = {
  list: (params: WorkerListParams) => api.workers.list(params as Record<string, string | number | undefined>),
  get: (id: string) => api.workers.get(id),
  create: (data: WorkerFormData) => api.workers.create(data),
  update: (id: string, data: Partial<WorkerFormData>) => api.workers.update(id, data),
  deactivate: (id: string) => api.workers.deactivate(id),
  activate: (id: string) => api.workers.activate(id),
  setPin: (id: string, pin: string) => api.workers.setPin(id, pin),
  resetPin: (id: string) => api.workers.resetPin(id),
  setFacePhoto: (id: string, photo: string) => api.workers.setFacePhoto(id, photo),
  removeFacePhoto: (id: string) => api.workers.removeFacePhoto(id),
};
