import { createMMKV } from "react-native-mmkv";
import { UserPublicSchema, type UserPublic } from "@/services/auth";

const storage = createMMKV({ id: "takda.preferences" });
const USER_KEY = "auth.user" as const;

export const preferenceStorage = {
  getString(key: string): string | null {
    return storage.getString(key) ?? null;
  },
  setString(key: string, value: string): void {
    storage.set(key, value);
  },
  remove(key: string): void {
    storage.remove(key);
  },
};

export const userCacheStorage = {
  getUser(): UserPublic | null {
    const raw = storage.getString(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = UserPublicSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        storage.remove(USER_KEY);
        return null;
      }
      return parsed.data;
    } catch {
      storage.remove(USER_KEY);
      return null;
    }
  },

  setUser(user: UserPublic): void {
    storage.set(USER_KEY, JSON.stringify(user));
  },

  clearUser(): void {
    storage.remove(USER_KEY);
  },
};
