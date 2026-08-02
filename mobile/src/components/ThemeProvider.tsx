import { useEffect } from "react";
import { Appearance, useColorScheme } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { normalizeSystem, useThemeStore } from "@/stores/theme";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const system = useColorScheme();
  const resolved = useThemeStore((s) => s.resolved);
  const setSystem = useThemeStore((s) => s.setSystem);

  useEffect(() => {
    const next = normalizeSystem(system);
    setSystem(next ?? normalizeSystem(Appearance.getColorScheme()));
  }, [system, setSystem]);

  useEffect(() => {
    NavigationBar.setStyle(resolved === "dark" ? "light" : "dark");
  }, [resolved]);

  return (
    <>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      {children}
    </>
  );
}