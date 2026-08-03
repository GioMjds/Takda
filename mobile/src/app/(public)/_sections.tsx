import { Linking, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { StyledText } from "@/components";
import { ChevronLeft } from "@/components/illustrations";
import type { Section } from "./_types";

type LegalSectionsProps = {
  sections: Section[];
  questionsTitle: string;
  questionsBody: string;
  questionsEmail: string;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function LegalSections({
  sections,
  questionsTitle,
  questionsBody,
  questionsEmail,
}: LegalSectionsProps) {
  return (
    <View className="gap-4">
      {sections.map((section, index) => (
        <View
          key={section.title}
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
          <StyledText variant="extrabold" className="text-sm text-primary">
            {pad2(index + 1)}.
          </StyledText>
          <StyledText
            variant="semibold"
            className="mt-1 text-base text-on-surface"
          >
            {section.title}
          </StyledText>
          <Text className="mt-2 text-sm leading-7 text-on-surface">
            {section.body}
          </Text>
        </View>
      ))}

      <View
        className="mt-2 rounded-2xl bg-surface-raised p-5"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <StyledText variant="semibold" className="text-sm text-on-surface">
          {questionsTitle}
        </StyledText>
        <Text className="mt-2 text-sm leading-6 text-on-surface-muted">
          {questionsBody}{" "}
          <Text
            className="text-primary underline"
            onPress={() => void Linking.openURL(`mailto:${questionsEmail}`)}
          >
            {questionsEmail}
          </Text>
          .
        </Text>
        <Link href="/(public)/welcome" asChild>
          <Pressable
            accessibilityRole="link"
            className="mt-4 h-11 flex-row items-center gap-2 self-start rounded-full px-2 active:opacity-60"
          >
            <ChevronLeft size={18} className="text-primary" />
            <Text className="text-sm font-semibold text-primary">
              Back to Takda
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
