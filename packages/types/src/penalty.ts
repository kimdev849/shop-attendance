/**
 * Penalty-related types shared between API, Dashboard, and Tablet app.
 * These are pure types with no runtime dependencies.
 */

export enum PenaltyStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface Penalty {
  id: string;
  workerId: string;
  attendanceId: string;
  amount: number;
  reason: string;
  status: PenaltyStatus;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PenaltyTier {
  fromMinutes: number;
  toMinutes: number | null; // null = illimité (> X minutes)
  amount: number;
}

export interface PenaltyRule {
  id: string;
  fromMinutes: number;
  toMinutes: number | null;
  amount: number;
  label?: string;
  createdAt: Date;
  updatedAt: Date;
}
