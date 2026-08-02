import { create } from "zustand";
import { tokenStorage } from "@/storage/secure";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  status: AuthStatus;
  token: string | null;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  token: null,
  user: null,

  async signIn(token, user) {
    await tokenStorage.setToken(token);
    set({ status: "authenticated", token, user });
  },

  async signOut() {
    await tokenStorage.clear();
    set({ status: "anonymous", token: null, user: null });
  },

  async hydrate() {
    const token = await tokenStorage.getToken();
    set({
      status: token ? "authenticated" : "anonymous",
      token,
      user: null,
    });
  },
}));

export const getAuthToken = () => useAuthStore.getState().token;
