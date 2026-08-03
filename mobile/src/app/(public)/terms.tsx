import { ScrollView, Text, View } from "react-native";
import { StyledText } from "@/components";
import { Section } from "./types";

const LAST_UPDATED = "2026-08-03";

const SECTIONS = [
  {
    title: "1. Acceptable use",
    body: "You agree to use Takda in compliance with applicable laws and the documented API limits. You will not probe, scan, or test the platform's security without prior written permission.",
  },
  {
    title: "2. Account termination",
    body: "We may suspend or terminate your account if you breach these terms, if your tenant is inactive for more than 12 months, or if we are required to do so by law.",
  },
  {
    title: "3. Liability",
    body: "Takda is provided as-is. To the maximum extent permitted by law, we disclaim all warranties and are not liable for any indirect or consequential losses arising from your use of the service.",
  },
  {
    title: "4. Governing law",
    body: "These terms are governed by the laws of the jurisdiction in which your tenant is registered. Disputes will be resolved in the courts of that jurisdiction.",
  },
  {
    title: "5. Contact",
    body: "Questions about these terms can be sent to legal@takda.app.",
  },
  {
    title: "6. Changes",
    body: "We may update these terms from time to time. We will post the revised version here and update the date below. Continued use of Takda after a change means you accept the revised terms.",
  },
] satisfies Section[];

export default function Terms() {
  return (
    <ScrollView
      className="flex-1 bg-surface px-6"
      contentContainerClassName="py-10"
    >
      <StyledText variant="bold" className="text-2xl text-foreground">
        Terms of service
      </StyledText>
      <Text className="mt-1 text-xs text-foreground/60">
        Last updated {LAST_UPDATED}
      </Text>

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
