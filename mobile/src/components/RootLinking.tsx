import { useEffect } from "react";
import * as Linking from "expo-linking";
import { Href, router } from "expo-router";

const RESET_PATH = "/reset-password" as Href;
const RESET_TARGET = "/(auth)/reset-password" as Href;

export function RootLinking() {
  useEffect(() => {
    function handle(url: string | null) {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const path = parsed.pathname.replace(/\/+$/u, "");
        if (path !== RESET_PATH) return;
        const token = parsed.searchParams.get("token") ?? "";
        router.replace({
          pathname: RESET_TARGET,
          params: token ? { token } : {},
        });
      } catch {
        // ignore unparseable URLs
      }
    }

    void Linking.getInitialURL().then(handle);

    const sub = Linking.addEventListener("url", (event) => {
      handle(event.url);
    });

    return () => sub.remove();
  }, []);

  return null;
}
