/**
 * Auth feature API calls.
 * All API interactions for authentication are centralized here.
 */
import { api } from "@/lib/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export const authApi = {
  login: (credentials: LoginCredentials) => api.auth.login(credentials.email, credentials.password),
};
