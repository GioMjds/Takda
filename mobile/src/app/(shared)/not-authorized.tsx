import { useState } from "react";
import { router } from "expo-router";
import { ScrollView, Text, Pressable } from "react-native";
import { useAuthStore } from "@/stores/auth";
import { StyledText } from "@/components";
import { handleActionError } from "@/configs/fetch";

export default function NotAuthorized() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignOut() {
    setBusy(true);
    setError(null);
    try {
      await useAuthStore.getState().signOut();
      router.replace("/(public)/welcome");
    } catch (e) {
      setError(handleActionError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-surface px-6"
      contentContainerClassName="items-center justify-center py-16"
    >
      <StyledText variant="bold" className="text-2xl text-on-surface">
        Not authorized
      </StyledText>
      <StyledText
        variant="light"
        className="mt-3 text-center text-sm text-on-surface"
      >
        Your account type isn&apos;t supported on this app. Sign out and sign in
        with a different account to continue.
      </StyledText>
      {error ? (
        <Text className="mt-4 text-sm text-red-600">{error}</Text>
      ) : null}
      <Pressable
        onPress={onSignOut}
        disabled={busy}
        className="mt-8 h-12 w-full max-w-sm items-center justify-center rounded-md bg-primary active:opacity-80 disabled:opacity-60"
      >
        <StyledText
          variant="extrabold"
          className="text-base font-semibold text-white"
        >
          Sign out
        </StyledText>
      </Pressable>
    </ScrollView>
  );
}
