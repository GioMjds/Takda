import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/stores/auth";
import { RootRoleRedirect } from "./RootRoleRedirect";

const SPLASH_COLOR = "#208AEF";

export function AuthGate() {
  const status = useAuthStore((s) => s.status);

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: SPLASH_COLOR,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (status === "authenticated") {
    return <RootRoleRedirect />;
  }

  return null;
}
