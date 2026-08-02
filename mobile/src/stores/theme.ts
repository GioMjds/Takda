import { create } from "zustand";
import { Appearance } from "react-native";
import { preferenceStorage } from "@/storage/mmkv";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme.preference";

type SystemScheme = "light" | "dark" | null;
type Resolved = "light" | "dark";

interface ThemeState {
  preference: ThemePreference;
  system: SystemScheme;
  resolved: Resolved;
  setPreference: (next: ThemePreference) => void;
  setSystem: (next: SystemScheme) => void;
  hydrate: () => void;
}

function readPersisted(): ThemePreference {
  const stored = preferenceStorage.getString(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function readSystem(): SystemScheme {
  const v = Appearance.getColorScheme();
  return v === "light" || v === "dark" ? v : null;
}

export function normalizeSystem(
  v: "light" | "dark" | "unspecified" | null | undefined,
): SystemScheme {
  return v === "light" || v === "dark" ? v : null;
}

function resolve(preference: ThemePreference, system: SystemScheme): Resolved {
  if (preference === "system") {
    return system === "dark" ? "dark" : "light";
  }
  return preference;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: "system",
  system: readSystem(),
  resolved: resolve("system", readSystem()),

  setPreference(next) {
    preferenceStorage.setString(STORAGE_KEY, next);
    Appearance.setColorScheme(
      next === "system" ? "unspecified" : next,
    );
    set({
      preference: next,
      resolved: resolve(next, get().system),
    });
  },

  setSystem(next) {
    const { preference } = get();
    set({
      system: normalizeSystem(next),
      resolved: resolve(preference, normalizeSystem(next)),
    });
  },

  hydrate() {
    const preference = readPersisted();
    const system = readSystem();
    set({
      preference,
      system,
      resolved: resolve(preference, system),
    });
  },
}));

export const getThemePreference = () => useThemeStore.getState().preference;
export const getResolvedTheme = () => useThemeStore.getState().resolved;