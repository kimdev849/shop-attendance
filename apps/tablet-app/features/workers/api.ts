/**
 * Workers feature API for tablet app.
 * Handles worker lookup and verification.
 */
import { api } from "@/services/api";

export interface WorkerLookup {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  hasPin: boolean;
  hasFacePhoto: boolean;
}

export interface PinVerification {
  verified: boolean;
  workerId: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

export interface WorkerRosterItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}

export const workersFeatureApi = {
  lookup: (employeeNumber: string, shopId: string) =>
    api.get<WorkerLookup>(`/workers/lookup/${employeeNumber}`, { params: { shopId } }),
  
  verifyPin: (employeeNumber: string, shopId: string, pin: string) =>
    api.post<PinVerification>("/workers/verify-pin", { employeeNumber, shopId, pin }),
  
  getRoster: (shopId: string) =>
    api.get<WorkerRosterItem[]>(`/workers/roster/${shopId}`),
};
