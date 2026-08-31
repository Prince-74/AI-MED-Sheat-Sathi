import { User } from "@/lib/type";
import { getWithAuth, postWithoutAuth, postWithAuth, putWithAuth } from "@/service/httpService";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthStatus = "INITIALIZING" | "AUTHENTICATED" | "UNAUTHENTICATED";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  initAuth: () => Promise<void>;
  setUser: (user: User, token: string) => void;
  clearError: () => void;
  logout: () => Promise<void>;

  // API Actions
  loginDoctor: (email: string, password: string) => Promise<void>;
  loginPatient: (email: string, password: string) => Promise<void>;
  registerDoctor: (data: Record<string, unknown>) => Promise<void>;
  registerPatient: (data: { name: string; email: string; password: string; [key: string]: unknown }) => Promise<void>;
  fetchProfile: () => Promise<User | null>;
  updateProfile: (data: Record<string, unknown>) => Promise<void>;
}

export const userAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: "INITIALIZING",
      user: null,
      token: null,
      loading: false,
      error: null,
      isAuthenticated: false,

      initAuth: async () => {
        const currentToken = get().token || localStorage.getItem("token");
        if (!currentToken) {
          // Attempt refresh using HttpOnly cookie if available
          try {
            const res = await postWithoutAuth<{ token: string; user: User }>("/auth/refresh", {});
            if (res?.data?.token && res?.data?.user) {
              get().setUser(res.data.user, res.data.token);
              return;
            }
          } catch {
            // No valid refresh cookie
          }
          set({ status: "UNAUTHENTICATED", isAuthenticated: false, user: null, token: null });
          return;
        }

        try {
          const response = await getWithAuth<{ user: User }>("/auth/me");
          if (response?.data?.user) {
            set({
              user: response.data.user,
              token: currentToken,
              isAuthenticated: true,
              status: "AUTHENTICATED",
              error: null,
            });
          } else {
            set({ status: "UNAUTHENTICATED", isAuthenticated: false, user: null, token: null });
          }
        } catch {
          // Token might be expired, try refreshing
          try {
            const refreshRes = await postWithoutAuth<{ token: string; user: User }>("/auth/refresh", {});
            if (refreshRes?.data?.token && refreshRes?.data?.user) {
              get().setUser(refreshRes.data.user, refreshRes.data.token);
              return;
            }
          } catch {
            // Refresh failed
          }
          localStorage.removeItem("token");
          set({ status: "UNAUTHENTICATED", isAuthenticated: false, user: null, token: null });
        }
      },

      setUser: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          status: "AUTHENTICATED",
          error: null,
        });
        if (token) {
          localStorage.setItem("token", token);
        }
      },

      clearError: () => set({ error: null }),

      logout: async () => {
        try {
          await postWithoutAuth("/auth/logout", {});
        } catch {
          // Silent catch on network error
        } finally {
          localStorage.removeItem("token");
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            status: "UNAUTHENTICATED",
            error: null,
          });
        }
      },

      loginDoctor: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const response = await postWithoutAuth<{ token: string; user: User }>("/auth/doctor/login", {
            email,
            password,
          });
          get().setUser(response.data.user, response.data.token);
        } catch (error: any) {
          const msg = error?.message || "Invalid email or password";
          set({ error: msg });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      loginPatient: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const response = await postWithoutAuth<{ token: string; user: User }>("/auth/patient/login", {
            email,
            password,
          });
          get().setUser(response.data.user, response.data.token);
        } catch (error: any) {
          const msg = error?.message || "Invalid email or password";
          set({ error: msg });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      registerDoctor: async (data: Record<string, unknown>) => {
        set({ loading: true, error: null });
        try {
          const response = await postWithoutAuth<{ token: string; user: User }>("/auth/doctor/register", data);
          get().setUser(response.data.user, response.data.token);
        } catch (error: any) {
          const msg = error?.message || "Registration failed";
          set({ error: msg });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      registerPatient: async (data: { name: string; email: string; password: string; [key: string]: unknown }) => {
        set({ loading: true, error: null });
        try {
          const response = await postWithoutAuth<{ token: string; user: User }>("/auth/patient/register", data);
          get().setUser(response.data.user, response.data.token);
        } catch (error: any) {
          const msg = error?.message || "Registration failed";
          set({ error: msg });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchProfile: async (): Promise<User | null> => {
        set({ loading: true, error: null });
        try {
          const { user } = get();
          if (!user) throw new Error("No user found");
          const endPoint = user.type === "doctor" ? "/doctor/me" : "/patient/me";
          const response = await getWithAuth(endPoint);
          set({ user: { ...user, ...response.data } });
          return response.data;
        } catch (error: any) {
          const msg = error?.message || "Failed to fetch profile";
          set({ error: msg });
          return null;
        } finally {
          set({ loading: false });
        }
      },

      updateProfile: async (data: Record<string, unknown>) => {
        set({ loading: true, error: null });
        try {
          const { user } = get();
          if (!user) throw new Error("No user found");
          const endPoint =
            user.type === "doctor" ? "/doctor/onboarding/update" : "/patient/onboarding/update";
          const response = await putWithAuth(endPoint, data);
          set({ user: { ...user, ...response.data } });
        } catch (error: any) {
          const msg = error?.message || "Failed to update profile";
          set({ error: msg });
          throw error;
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
