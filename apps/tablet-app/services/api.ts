import type { CheckInPayload, CheckInResult, SyncAttendanceResult } from "@shop-attendance/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://shop-attendance-api.onrender.com";
const TIMEOUT_MS = 30_000; // 30s – Render cold-start can take 30-60s
const MAX_RETRIES = 2;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } catch (err: any) {
      lastError = err;
      if (err?.name === "AbortError" || err?.message?.includes("Network")) {
        await new Promise((r) => setTimeout(r, 3_000 * (attempt + 1)));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

// ── Check-in / Attendance ──────────────────────────────────────────

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

// ── Workers ────────────────────────────────────────────────────────

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

// ── Heartbeat ───────────────────────────────────────────────────────

/**
 * Send a heartbeat to the server to report this device is alive.
 * Called every 60s from _layout.tsx.
 */
export async function sendHeartbeat(deviceId: string) {
  try {
    await fetchWithTimeout(`${API_URL}/v1/devices/${deviceId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Silent fail — heartbeat is best-effort
  }
}

// ── Setup: Shops & Device Registration ─────────────────────────────

export interface ShopSummary {
  id: string;
  name: string;
  code: string;
  city?: string;
  status: string;
}

/**
 * Fetch shops list (paginated, with search).
 * Used by the settings screen to populate the shop selector.
 */
export async function fetchShops(search?: string, page = 1, limit = 50) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("status", "ACTIVE"); // Only show active shops

  // Use public endpoint (no auth required for initial tablet setup)
  const response = await fetchWithTimeout(`${API_URL}/v1/shops/list?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) throw new Error("Impossible de récupérer la liste des shops.");
  return response.json() as Promise<{
    data: ShopSummary[];
    total: number;
    page: number;
    totalPages: number;
  }>;
}

/**
 * Find an existing device by name + shopId.
 * The admin creates the tablet on the dashboard first, then the user
 * enters the same name/shop on the tablet settings to link to it.
 */
export async function findExistingDevice(name: string, shopId: string) {
  const params = new URLSearchParams({ name, shopId });
  const response = await fetchWithTimeout(`${API_URL}/v1/devices/find?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "Tablette introuvable. Créez-la d'abord depuis le dashboard admin.");
  }

  return response.json() as Promise<{
    id: string;
    deviceIdentifier: string;
    name: string;
    shopId: string;
    status: string;
  }>;
}
