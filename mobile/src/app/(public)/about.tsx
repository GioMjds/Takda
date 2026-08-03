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
      <View
        className="relative overflow-hidden rounded-2xl bg-surface-raised p-5"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent-500" />
        <Text className="text-sm leading-7 text-on-surface">
          Takda is a queue and appointment platform for service businesses. Sign
          in to manage your branch, services, and customers.
        </Text>
      </View>

      <View
        className="mt-4 rounded-2xl bg-surface-raised p-5"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <StyledText variant="semibold" className="text-sm text-on-surface">
          Talk to us
        </StyledText>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          className="mt-3 h-11 flex-row items-center justify-between rounded-xl bg-surface-sunken px-4 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-primary">
            {SUPPORT_EMAIL}
          </Text>
          <ChevronRight size={18} className="text-primary" />
        </Pressable>
        <Text className="mt-3 text-xs text-on-surface-muted">
          Version {version}
        </Text>
      </View>
    </PublicScreen>
  );
}
