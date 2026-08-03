import Constants from "expo-constants";
import { ScrollView, Text, View, Linking } from "react-native";
import { StyledText } from "@/components";

const SUPPORT_EMAIL = "support.takda@gmail.com" as const;

export default function About() {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      className="flex-1 bg-surface px-6"
      contentContainerClassName="py-10"
    >
      <StyledText variant="bold" className="text-2xl text-foreground">
        About Takda
      </StyledText>
      <Text className="mt-3 text-sm leading-6 text-foreground">
        Takda is a queue and appointment platform for service businesses. Sign
        in to manage your branch, services, and customers.
      </Text>

      <View className="mt-8">
        <StyledText variant="semibold" className="text-base text-foreground">
          Version
        </StyledText>
        <Text className="mt-1 text-sm text-foreground">{version}</Text>
      </View>

      <View className="mt-6">
        <StyledText variant="semibold" className="text-base text-foreground">
          Support
        </StyledText>
        <Text
          className="mt-1 text-sm text-primary"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        >
          {SUPPORT_EMAIL}
        </Text>
      </View>
    </ScrollView>
  );
}
