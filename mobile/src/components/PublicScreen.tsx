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
        className="flex-1 w-full"
        contentContainerClassName="px-6 pb-24 w-full"
        contentContainerStyle={{
          paddingTop: insets.top + (showBackButton ? 56 : 24),
          maxWidth: 480,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {showBackButton ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="absolute left-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-surface-sunken active:opacity-60"
            style={{ top: insets.top + 8 }}
          >
            <ChevronLeft size={22} className="text-on-surface-muted" />
          </Pressable>
        ) : null}

        {eyebrow ? (
          <StyledText
            variant="semibold"
            className="text-xs font-semibold text-primary uppercase"
          >
            {eyebrow}
          </StyledText>
        ) : null}

        {title ? (
          <StyledText
            variant="extrabold"
            className="mt-1 text-3xl leading-tight tracking-tight text-on-surface"
          >
            {title}
          </StyledText>
        ) : null}

        {subtitle ? (
          <Text className="mt-2 text-sm leading-6 text-on-surface-muted">
            {subtitle}
          </Text>
        ) : null}

        <View className="mt-6 w-full">{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
