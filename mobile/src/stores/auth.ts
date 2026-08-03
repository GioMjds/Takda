import { create } from "zustand";
import { tokenStorage, refreshTokenStorage, clearAuth } from "@/storage/secure";
import { userCacheStorage } from "@/storage/mmkv";
import { authService, type UserPublic, type UserRole } from "@/services/auth";
import { configureFetchAuth } from "@/configs/fetch";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  user: UserPublic | null;
  signIn: (
    accessToken: string,
    refreshToken: string,
    user: UserPublic,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshUser: (user: UserPublic) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  accessToken: null,
  refreshToken: null,
  user: null,

  async signIn(accessToken, refreshToken, user) {
    await Promise.all([
      tokenStorage.setToken(accessToken),
      refreshTokenStorage.setRefreshToken(refreshToken),
    ]);
    userCacheStorage.setUser(user);
    set({ status: "authenticated", accessToken, refreshToken, user });
  },

  async signOut() {
    await clearAuth();
    userCacheStorage.clearUser();
    set({
      status: "anonymous",
      accessToken: null,
      refreshToken: null,
      user: null,
    });
  },

  async hydrate() {
    const accessToken = await tokenStorage.getToken();
    if (!accessToken) {
      set({
        status: "anonymous",
        accessToken: null,
        refreshToken: null,
        user: null,
      });
      return;
    }

    const refreshToken = await refreshTokenStorage.getRefreshToken();
    const cached = userCacheStorage.getUser();
    if (cached) {
      set({
        status: "authenticated",
        accessToken,
        refreshToken,
        user: cached,
      });
      return;
    }

    try {
      const fresh = await authService.me();
      userCacheStorage.setUser(fresh);
      set({
        status: "authenticated",
        accessToken,
        refreshToken,
        user: fresh,
      });
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      if (status === 401) {
        await clearAuth();
        userCacheStorage.clearUser();
        set({
          status: "anonymous",
          accessToken: null,
          refreshToken: null,
          user: null,
        });
        return;
      }
      set({ status: "anonymous", accessToken, refreshToken, user: null });
    }
  },

  refreshUser(user) {
    userCacheStorage.setUser(user);
    set({ user });
  },
}));

configureFetchAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshAccessToken: async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const next = await authService.refresh({ refreshToken });
    await useAuthStore
      .getState()
      .signIn(next.accessToken, next.refreshToken, next.user);
    return next.accessToken;
  },
  onAuthFailure: () => {
    void useAuthStore.getState().signOut().catch(() => undefined);
  },
});

export const useAuthRole = (): UserRole | undefined =>
  useAuthStore((s) => s.user?.role);

export const getAuthToken = (): string | null =>
  useAuthStore.getState().accessToken;

