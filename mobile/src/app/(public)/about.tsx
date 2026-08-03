import Constants from "expo-constants";
import { Linking, Pressable, Text, View } from "react-native";
import { PublicScreen, StyledText } from "@/components";
import { ChevronRight } from "@/components/illustrations";

const SUPPORT_EMAIL = "support.takda@gmail.com" as const;

export default function About() {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <PublicScreen
      eyebrow="About"
      title="About Takda"
      subtitle="Queue and booking for the businesses that keep the neighbourhood moving."
      showBackButton
    >
      <View className="w-full rounded-xl border border-border/60 bg-surface-raised p-5">
        <Text className="text-sm leading-relaxed text-on-surface">
          Takda is a queue and appointment platform for service businesses. Sign
          in to manage your branch, services, and customers.
        </Text>
      </View>

      <View className="mt-4 w-full rounded-xl border border-border/60 bg-surface-raised p-5">
        <StyledText variant="semibold" className="text-sm font-semibold text-on-surface">
          Talk to us
        </StyledText>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          className="mt-3 h-11 flex-row items-center justify-between rounded-xl border border-primary/20 bg-primary-50/40 px-4 active:opacity-70 dark:bg-primary-950/40"
        >
          <Text className="text-sm font-semibold text-primary">
            {SUPPORT_EMAIL}
          </Text>
          <ChevronRight size={18} className="text-primary" />
        </Pressable>
        <View className="mt-4 self-start rounded-full bg-surface-sunken px-3 py-1">
          <Text className="text-xs font-medium text-on-surface-muted">
            Version {version}
          </Text>
        </View>
      </View>
    </PublicScreen>
  );
}
