import axios from "axios";

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

// --- Endpoints typés ---------------------------------------------------

export const api = {
  auth: {
    login: (email: string, password: string) => apiClient.post("/auth/login", { email, password }),
  },
  dashboard: {
    stats: () => apiClient.get("/dashboard/stats"),
    attendanceByShop: () => apiClient.get("/dashboard/attendance-by-shop"),
    dailyTrend: (days = 14) => apiClient.get(`/dashboard/daily-trend?days=${days}`),
  },
  shops: {
    list: (params?: Record<string, string | number | undefined>) => apiClient.get("/shops", { params }),
    get: (id: string) => apiClient.get(`/shops/${id}`),
    stats: (id: string) => apiClient.get(`/shops/${id}/stats`),
    create: (data: any) => apiClient.post("/shops", data),
    update: (id: string, data: any) => apiClient.patch(`/shops/${id}`, data),
    activate: (id: string) => apiClient.patch(`/shops/${id}/activate`),
    deactivate: (id: string) => apiClient.patch(`/shops/${id}/deactivate`),
  },
  workers: {
    list: (params?: Record<string, string | number | undefined>) =>
      apiClient.get("/workers", { params }),
    get: (id: string) => apiClient.get(`/workers/${id}`),
    create: (data: any) => apiClient.post("/workers", data),
    update: (id: string, data: any) => apiClient.patch(`/workers/${id}`, data),
    activate: (id: string) => apiClient.patch(`/workers/${id}/activate`),
    deactivate: (id: string) => apiClient.patch(`/workers/${id}/deactivate`),
    assignSchedule: (id: string, data: any) => apiClient.post(`/workers/${id}/schedules`, data),
    setPin: (id: string, pin: string) => apiClient.patch(`/workers/${id}/set-pin`, { pin }),
    resetPin: (id: string) => apiClient.patch(`/workers/${id}/reset-pin`),
    setFacePhoto: (id: string, facePhoto: string) => apiClient.patch(`/workers/${id}/face-photo`, { facePhoto }),
    getFacePhoto: (id: string) => apiClient.get(`/workers/${id}/face-photo`),
    removeFacePhoto: (id: string) => apiClient.patch(`/workers/${id}/remove-face-photo`),
  },
  attendance: {
    list: (params?: Record<string, string | number | undefined>) => apiClient.get("/attendance", { params }),
    get: (id: string) => apiClient.get(`/attendance/${id}`),
  },
  absences: {
    list: (params?: Record<string, string | number | undefined>) => apiClient.get("/absences", { params }),
    create: (data: any) => apiClient.post("/absences", data),
    validate: (id: string) => apiClient.patch(`/absences/${id}/validate`),
    reject: (id: string) => apiClient.patch(`/absences/${id}/reject`),
  },
  penalties: {
    list: (params?: Record<string, string | number | undefined>) => apiClient.get("/penalties", { params }),
    approve: (id: string) => apiClient.patch(`/penalties/${id}/approve`),
    reject: (id: string) => apiClient.patch(`/penalties/${id}/reject`),
    cancel: (id: string) => apiClient.patch(`/penalties/${id}/cancel`),
  },
  penaltyRules: {
    list: () => apiClient.get("/penalty-rules"),
    create: (data: any) => apiClient.post("/penalty-rules", data),
    update: (id: string, data: any) => apiClient.patch(`/penalty-rules/${id}`, data),
    remove: (id: string) => apiClient.delete(`/penalty-rules/${id}`),
  },
  devices: {
    list: (params?: Record<string, string | number | undefined>) => apiClient.get("/devices", { params }),
    get: (id: string) => apiClient.get(`/devices/${id}`),
    create: (data: any) => apiClient.post("/devices", data),
    update: (id: string, data: any) => apiClient.patch(`/devices/${id}`, data),
  },
  users: {
    list: (params?: Record<string, string | number | undefined>) => apiClient.get("/users", { params }),
    get: (id: string) => apiClient.get(`/users/${id}`),
    create: (data: any) => apiClient.post("/users", data),
    update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
    activate: (id: string) => apiClient.patch(`/users/${id}/activate`),
    deactivate: (id: string) => apiClient.patch(`/users/${id}/deactivate`),
  },
  auditLogs: {
    list: (params?: Record<string, string | number | undefined>) => apiClient.get("/audit-logs", { params }),
  },
  reports: {
    attendance: (params: Record<string, string | undefined>) =>
      apiClient.get("/reports/attendance", { params }),
    lateness: (params: Record<string, string | undefined>) => apiClient.get("/reports/lateness", { params }),
    absences: (params: Record<string, string | undefined>) => apiClient.get("/reports/absences", { params }),
    penalties: (params: Record<string, string | undefined>) => apiClient.get("/reports/penalties", { params }),
  },
};