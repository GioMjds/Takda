import "../../global.css";
import { useEffect } from "react";
import { View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { ThemeProvider as AppThemeProvider, AuthGate, RootLinking } from "@/components";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Manrope-Bold": require("@/assets/fonts/Manrope-Bold.ttf"),
    "Manrope-ExtraBold": require("@/assets/fonts/Manrope-ExtraBold.ttf"),
    "Manrope-ExtraLight": require("@/assets/fonts/Manrope-ExtraLight.ttf"),
    "Manrope-Light": require("@/assets/fonts/Manrope-Light.ttf"),
    "Manrope-Medium": require("@/assets/fonts/Manrope-Medium.ttf"),
    "Manrope-Regular": require("@/assets/fonts/Manrope-Regular.ttf"),
    "Manrope-SemiBold": require("@/assets/fonts/Manrope-SemiBold.ttf"),
  });

  const resolvedTheme = useThemeStore((s) => s.resolved);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    if (!fontsLoaded) return;
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    void NavigationBar.NavigationBar;
  }, []);

  useEffect(() => {
    void useAuthStore.getState().hydrate();
    hydrateTheme();
  }, [hydrateTheme]);

  const rootClass = resolvedTheme === "dark" ? "dark bg-surface" : "bg-surface";

  return (
    <AppThemeProvider>
      <View className={rootClass} style={{ flex: 1 }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <SafeAreaView className="flex-1 bg-surface" style={{ flex: 1 }}>
                <RootLinking />
                <AuthGate />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                  }}
                />
              </SafeAreaView>
            </SafeAreaProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </View>
    </AppThemeProvider>
  );
}
