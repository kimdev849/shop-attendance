import type { CheckInPayload, CheckInResult, SyncAttendanceResult } from "@shop-attendance/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitCheckIn(payload: CheckInPayload): Promise<CheckInResult> {
  const response = await fetchWithTimeout(`${API_URL}/v1/attendance/check-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur serveur (${response.status})`);
  }

  return response.json();
}

export async function syncAttendanceBatch(
  items: CheckInPayload[],
): Promise<{ total: number; succeeded: number; failed: number; results: SyncAttendanceResult[] }> {
  const response = await fetchWithTimeout(`${API_URL}/v1/sync/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur serveur (${response.status})`);
  }

  return response.json();
}

/** Récupère le roster complet (travailleurs actifs) d'un shop, pour rafraîchir le cache local hors ligne. */
export async function fetchWorkerRoster(shopId: string) {
  const response = await fetchWithTimeout(
    `${API_URL}/v1/workers/roster?${new URLSearchParams({ shopId }).toString()}`,
    { method: "GET" },
  );
  if (!response.ok) throw new Error("Impossible de récupérer la liste des travailleurs.");
  return response.json();
}

export async function lookupWorkerByEmployeeNumber(employeeNumber: string, shopId: string) {
  const params = new URLSearchParams({ employeeNumber, shopId });
  const response = await fetchWithTimeout(`${API_URL}/v1/workers/lookup?${params.toString()}`, {
    method: "GET",
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Impossible de vérifier le matricule.");
  }
  return response.json();
}

export async function verifyWorkerPin(employeeNumber: string, shopId: string, pin: string) {
  const response = await fetchWithTimeout(`${API_URL}/v1/workers/verify-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeNumber, shopId, pin }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "Mot de passe incorrect.");
  }
  return response.json();
}

export async function getFacePhotoForCheckIn(employeeNumber: string, shopId: string) {
  const response = await fetchWithTimeout(`${API_URL}/v1/workers/face-photo-for-checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeNumber, shopId }),
  });
  if (!response.ok) return null;
  return response.json();
}
