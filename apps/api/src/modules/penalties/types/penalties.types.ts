/**
 * Penalties module types.
 * These are internal types used by the penalties module.
 * Shared types (used by frontend) are in packages/types/.
 */
import { PenaltyStatus } from "@prisma/client";

export interface PenaltyQueryParams {
  search?: string;
  status?: PenaltyStatus;
  workerId?: string;
  shopId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PenaltyRuleData {
  fromMinutes: number;
  toMinutes: number | null;
  amount: number;
  label?: string;
}
