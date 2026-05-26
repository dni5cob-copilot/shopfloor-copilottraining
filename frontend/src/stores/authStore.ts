import { create } from "zustand";
import { apiClient } from "../api/client";

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem("access_token"),
  userId: localStorage.getItem("user_id"),
  role: localStorage.getItem("user_role"),
  isAuthenticated: !!localStorage.getItem("access_token"),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ username, password });
      const { data } = await apiClient.post<{
        access_token: string;
        token_type: string;
      }>("/api/v1/auth/token", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("access_token", data.access_token);
      set({ accessToken: data.access_token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      set({ error: message, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role");
    set({ accessToken: null, userId: null, role: null, isAuthenticated: false });
  },
}));
