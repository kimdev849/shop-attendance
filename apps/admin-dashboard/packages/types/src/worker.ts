/**
 * Worker-related types shared between API, Dashboard, and Tablet app.
 * These are pure types with no runtime dependencies.
 */

export enum UserRole {
  ADMIN = "ADMIN",
  SHOP_MANAGER = "SHOP_MANAGER",
  WORKER = "WORKER",
}

export enum WorkerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export interface Worker {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  position?: string;
  status: WorkerStatus;
  shopId?: string;
  pinHash?: string | null;
  pinSetAt?: string | null;
  facePhoto?: string | null;
  facePhotoSetAt?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerLookup {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  hasPin: boolean;
  hasFacePhoto: boolean;
}

export interface WorkerRosterItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}
