import { Stack } from "expo-router";

export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="welcome" options={{ title: "Takda" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
      <Stack.Screen name="terms" options={{ title: "Terms" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
    </Stack>
  );
}
