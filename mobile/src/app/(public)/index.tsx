import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/auth";

export default function PublicIndex() {
  const status = useAuthStore((s) => s.status);
  if (status === "loading") return null;
  if (status === "authenticated") {
    return <Redirect href={null as never} />;
  }
  return <Redirect href="/(public)/welcome" />;
}
