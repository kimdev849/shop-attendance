/**
 * Workers module types.
 * These are internal types used by the workers module.
 * Shared types (used by frontend) are in packages/types/.
 */
import { WorkerStatus } from "@prisma/client";

export interface WorkerLookupResult {
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

export interface PinVerificationResult {
  verified: boolean;
  workerId: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

export interface WorkerQueryParams {
  search?: string;
  shopId?: string;
  status?: WorkerStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
