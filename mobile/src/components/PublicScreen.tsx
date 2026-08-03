import { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { StyledText } from "./StyledText";
import { ChevronLeft } from "./illustrations";

type PublicScreenProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  children: ReactNode;
};

export function PublicScreen({
  eyebrow,
  title,
  subtitle,
  showBackButton = false,
  children,
}: PublicScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-24 pt-12 max-w-md mx-auto w-full"
        contentContainerStyle={{ paddingTop: insets.top + 48 }}
      >
        {showBackButton ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="absolute left-4 z-10 h-11 w-11 items-center justify-center rounded-full active:opacity-60"
            style={{ top: insets.top + 8 }}
          >
            <ChevronLeft size={24} className="text-on-surface-muted" />
          </Pressable>
        ) : null}

        {eyebrow ? (
          <StyledText
            variant="extrabold"
            className="text-sm tracking-wide text-primary uppercase"
          >
            {eyebrow}
          </StyledText>
        ) : null}

        {title ? (
          <StyledText
            variant="extrabold"
            className="mt-2 text-4xl leading-tight text-on-surface"
          >
            {title}
          </StyledText>
        ) : null}

        {subtitle ? (
          <Text className="mt-3 text-base leading-6 text-on-surface-muted">
            {subtitle}
          </Text>
        ) : null}

        <View className="mt-8">{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
