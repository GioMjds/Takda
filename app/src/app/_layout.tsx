import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../../global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { useAuthStore } from "@/stores/auth";

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
    "StackSansText-Regular": require("../assets/fonts/StackSansText-Regular.ttf"),
    "StackSansText-ExtraLight": require("../assets/fonts/StackSansText-ExtraLight.ttf"),
    "StackSansText-Light": require("../assets/fonts/StackSansText-Light.ttf"),
    "StackSansText-Medium": require("../assets/fonts/StackSansText-Medium.ttf"),
    "StackSansText-SemiBold": require("../assets/fonts/StackSansText-SemiBold.ttf"),
    "StackSansText-Bold": require("../assets/fonts/StackSansText-Bold.ttf"),
  });

  const CustomTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "#ffffff",
    },
  };

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
  }, []);

  return (
    <ThemeProvider value={CustomTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            />
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
