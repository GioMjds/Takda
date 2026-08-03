import { ScrollView, Text, View } from "react-native";
import { StyledText } from "@/components";
import { Section } from "./types";

const LAST_UPDATED = "2026-08-03";

const SECTIONS = [
  {
    title: "1. What we collect",
    body: "When you create an account, we collect your first name, last name, email, and the role assigned to you by your tenant.",
  },
  {
    title: "2. Auth tokens",
    body: "We store two auth tokens on your device. The access token is short-lived and lets the app call the API. The refresh token is used to obtain a new access token when the current one expires. Both are stored in the device's secure keychain.",
  },
  {
    title: "3. Local cache",
    body: "We cache your profile in non-encrypted device storage so the app can render the home screen without a network round-trip on launch.",
  },
  {
    title: "4. Sharing",
    body: "We do not sell your data. We share data only with service providers that help us run the platform, or where required by law.",
  },
  {
    title: "5. Your rights",
    body: "You can request a copy of your data, ask us to correct it, or close your account by emailing privacy@takda.app.",
  },
  {
    title: "6. Changes",
    body: "We may update this policy from time to time. We will post the revised version here and update the date below.",
  },
] satisfies Section[];

export default function Privacy() {
  return (
    <ScrollView
      className="flex-1 bg-surface px-6"
      contentContainerClassName="py-10"
    >
      <StyledText variant="bold" className="text-2xl text-foreground">
        Privacy policy
      </StyledText>
      <StyledText variant="light" className="mt-1 text-xs text-foreground/60">
        Last updated {LAST_UPDATED}
      </StyledText>

      <View className="mt-6 gap-6">
        {SECTIONS.map((s) => (
          <View key={s.title}>
            <StyledText
              variant="semibold"
              className="text-base text-foreground"
            >
              {s.title}
            </StyledText>
            <Text className="mt-1 text-sm leading-6 text-foreground">
              {s.body}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
