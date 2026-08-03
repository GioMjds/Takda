import { useEffect } from "react";
import { Href, router } from "expo-router";
import { useAuthStore } from "@/stores/auth";

const BUSINESS_HOME = "/(business)/(tabs)/dashboard" as Href;
const CUSTOMER_HOME = "/(customer)/home" as Href;
const NOT_AUTHORIZED = "/(shared)/not-authorized" as Href;

export function RootRoleRedirect() {
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (!role) return;
    if (role === "BusinessOwner" || role === "Staff") {
      router.replace(BUSINESS_HOME);
      return;
    }
    if (role === "Customer") {
      router.replace(CUSTOMER_HOME);
      return;
    }
    router.replace(NOT_AUTHORIZED);
  }, [role]);

  return null;
}
