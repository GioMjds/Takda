import { useEffect } from "react";
import { router, Link, Href } from "expo-router";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useAuthStore } from "@/stores/auth";
import { StyledText } from "@/components";

const BUSINESS_HOME = "/(business)/(tabs)/dashboard" as Href;

export default function Welcome() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(BUSINESS_HOME);
    }
  }, [status]);

  return (
    <ScrollView
      className="flex-1 bg-surface px-6"
      contentContainerClassName="items-center justify-center py-16"
    >
      <StyledText variant="extrabold" className="text-4xl text-primary">
        Takda
      </StyledText>
      <Text className="mt-3 text-center text-base text-foreground">
        Queue management for service businesses.
      </Text>

      <View className="mt-12 w-full max-w-sm gap-3">
        <Link href="/(auth)/sign-in" asChild>
          <Pressable className="h-12 items-center justify-center rounded-md bg-primary active:opacity-80">
            <Text className="text-base font-semibold text-white">Sign in</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable className="h-12 items-center justify-center rounded-md border border-primary bg-transparent active:opacity-80">
            <Text className="text-base font-semibold text-primary">
              Create business account
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="mt-12 flex-row gap-6">
        <Link href="/(public)/about">
          <Text className="text-sm text-primary">About</Text>
        </Link>
        <Link href="/(public)/terms">
          <Text className="text-sm text-primary">Terms</Text>
        </Link>
        <Link href="/(public)/privacy">
          <Text className="text-sm text-primary">Privacy</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
