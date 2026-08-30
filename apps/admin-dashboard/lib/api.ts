import axios from "axios";
import { cachedFetch, invalidateCache } from "./cache";

export const API_URL = process.env.NEXT_PUBLIC_API_URL
  ?? (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : "http://localhost:3001");

export const apiClient = axios.create({
  baseURL: `${API_URL}/v1`,
});

// Attache automatiquement le token d'accès courant à chaque requête.
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("sa_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Tente un refresh silencieux une fois si le token a expiré (401), puis
// redirige vers /login si le refresh échoue également.
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (typeof window === "undefined") return Promise.reject(error);

    const refreshToken = window.localStorage.getItem("sa_refresh_token");
    if (!refreshToken) {
      window.localStorage.removeItem("sa_access_token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(apiClient(originalRequest)));
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post(`${API_URL}/v1/auth/refresh`, { refreshToken });
      window.localStorage.setItem("sa_access_token", data.accessToken);
      window.localStorage.setItem("sa_refresh_token", data.refreshToken);
      pendingQueue.forEach((cb) => cb());
      pendingQueue = [];
      return apiClient(originalRequest);
    } catch (refreshError) {
      window.localStorage.removeItem("sa_access_token");
      window.localStorage.removeItem("sa_refresh_token");
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/**
 * Helper: GET avec cache automatique (30s).
 * Les mutations (POST/PATCH/DELETE) invalident le cache du domaine.
 */
function cachedGet<T = any>(url: string, params?: Record<string, any>, ttl = 30_000): Promise<{ data: T }> {
  const key = `${url}?${JSON.stringify(params ?? {})}`;
  return cachedFetch(
    key,
    () => apiClient.get(url, { params }) as Promise<{ data: T }>,
    ttl,
  );
}

function invalidateDomain(domain: string) {
  if (typeof window !== "undefined") {
    invalidateCache(`/${domain}`);
  }
}

// --- Endpoints typés ---------------------------------------------------

export const api = {
  auth: {
    login: (email: string, password: string) => apiClient.post("/auth/login", { email, password }),
  },
  dashboard: {
    stats: () => cachedGet("/dashboard/stats", undefined, 60_000),
    attendanceByShop: () => cachedGet("/dashboard/attendance-by-shop", undefined, 60_000),
    dailyTrend: (days = 14) => cachedGet("/dashboard/daily-trend", { days }, 60_000),
  },
  shops: {
    list: (params?: Record<string, string | number | undefined>) => cachedGet("/shops", params),
    get: (id: string) => cachedGet(`/shops/${id}`, undefined, 15_000),
    stats: (id: string) => cachedGet(`/shops/${id}/stats`),
    create: (data: any) => { invalidateDomain("shops"); return apiClient.post("/shops", data); },
    update: (id: string, data: any) => { invalidateDomain("shops"); return apiClient.patch(`/shops/${id}`, data); },
    activate: (id: string) => { invalidateDomain("shops"); return apiClient.patch(`/shops/${id}/activate`); },
    deactivate: (id: string) => { invalidateDomain("shops"); return apiClient.patch(`/shops/${id}/deactivate`); },
  },
  workers: {
    list: (params?: Record<string, string | number | undefined>) => cachedGet("/workers", params),
    get: (id: string) => cachedGet(`/workers/${id}`, undefined, 15_000),
    create: (data: any) => { invalidateDomain("workers"); invalidateDomain("shops"); return apiClient.post("/workers", data); },
    update: (id: string, data: any) => { invalidateDomain("workers"); return apiClient.patch(`/workers/${id}`, data); },
    activate: (id: string) => { invalidateDomain("workers"); return apiClient.patch(`/workers/${id}/activate`); },
    deactivate: (id: string) => { invalidateDomain("workers"); return apiClient.patch(`/workers/${id}/deactivate`); },
    assignSchedule: (id: string, data: any) => { invalidateDomain("workers"); return apiClient.post(`/workers/${id}/schedules`, data); },
    setPin: (id: string, pin: string) => { invalidateDomain("workers"); return apiClient.patch(`/workers/${id}/set-pin`, { pin }); },
    resetPin: (id: string) => { invalidateDomain("workers"); return apiClient.patch(`/workers/${id}/reset-pin`); },
    setFacePhoto: (id: string, facePhoto: string) => { invalidateDomain("workers"); return apiClient.patch(`/workers/${id}/face-photo`, { facePhoto }); },
    getFacePhoto: (id: string) => apiClient.get(`/workers/${id}/face-photo`),
    removeFacePhoto: (id: string) => { invalidateDomain("workers"); return apiClient.patch(`/workers/${id}/remove-face-photo`); },
  },
  attendance: {
    list: (params?: Record<string, string | number | undefined>) => cachedGet("/attendance", params),
    get: (id: string) => cachedGet(`/attendance/${id}`),
  },
  absences: {
    list: (params?: Record<string, string | number | undefined>) => cachedGet("/absences", params),
    create: (data: any) => { invalidateDomain("absences"); return apiClient.post("/absences", data); },
    validate: (id: string) => { invalidateDomain("absences"); return apiClient.patch(`/absences/${id}/validate`); },
    reject: (id: string) => { invalidateDomain("absences"); return apiClient.patch(`/absences/${id}/reject`); },
  },
  penalties: {
    list: (params?: Record<string, string | number | undefined>) => cachedGet("/penalties", params),
    approve: (id: string) => { invalidateDomain("penalties"); return apiClient.patch(`/penalties/${id}/approve`); },
    reject: (id: string) => { invalidateDomain("penalties"); return apiClient.patch(`/penalties/${id}/reject`); },
    cancel: (id: string) => { invalidateDomain("penalties"); return apiClient.patch(`/penalties/${id}/cancel`); },
  },
  penaltyRules: {
    list: () => cachedGet("/penalty-rules", undefined, 60_000),
    create: (data: any) => { invalidateDomain("penalty-rules"); return apiClient.post("/penalty-rules", data); },
    update: (id: string, data: any) => { invalidateDomain("penalty-rules"); return apiClient.patch(`/penalty-rules/${id}`, data); },
    remove: (id: string) => { invalidateDomain("penalty-rules"); return apiClient.delete(`/penalty-rules/${id}`); },
  },
  devices: {
    list: (params?: Record<string, string | number | undefined>) => cachedGet("/devices", params),
    get: (id: string) => cachedGet(`/devices/${id}`),
    create: async (data: any) => { const res = await apiClient.post("/devices", data); invalidateDomain("devices"); return res; },
    update: async (id: string, data: any) => { const res = await apiClient.patch(`/devices/${id}`, data); invalidateDomain("devices"); return res; },
  },
  users: {
    list: (params?: Record<string, string | number | undefined>) => cachedGet("/users", params),
    get: (id: string) => cachedGet(`/users/${id}`),
    create: (data: any) => { invalidateDomain("users"); return apiClient.post("/users", data); },
    update: (id: string, data: any) => { invalidateDomain("users"); return apiClient.patch(`/users/${id}`, data); },
    activate: (id: string) => { invalidateDomain("users"); return apiClient.patch(`/users/${id}/activate`); },
    deactivate: (id: string) => { invalidateDomain("users"); return apiClient.patch(`/users/${id}/deactivate`); },
  },
  auditLogs: {
    list: (params?: Record<string, string | number | undefined>) => cachedGet("/audit-logs", params),
  },
  reports: {
    attendance: (params: Record<string, string | undefined>) => cachedGet("/reports/attendance", params, 60_000),
    lateness: (params: Record<string, string | undefined>) => cachedGet("/reports/lateness", params, 60_000),
    absences: (params: Record<string, string | undefined>) => cachedGet("/reports/absences", params, 60_000),
    penalties: (params: Record<string, string | undefined>) => cachedGet("/reports/penalties", params, 60_000),
  },
};
