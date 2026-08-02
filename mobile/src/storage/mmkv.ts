import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "takda.preferences" });

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