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
    <View className="w-full gap-4">
      {sections.map((section, index) => (
        <View
          key={section.title}
          className="w-full rounded-xl border border-border/60 bg-surface-raised p-5"
        >
          <View className="self-start rounded-md bg-primary-50 px-2 py-0.5 dark:bg-primary-950/80">
            <StyledText variant="semibold" className="text-xs font-bold text-primary">
              Section {pad2(index + 1)}
            </StyledText>
          </View>
          <StyledText
            variant="extrabold"
            className="mt-2 text-base font-bold text-on-surface tracking-tight"
          >
            {section.title}
          </StyledText>
          <Text className="mt-2 text-sm leading-relaxed text-on-surface-muted">
            {section.body}
          </Text>
        </View>
      ))}

      <View className="mt-2 w-full rounded-xl border border-border/60 bg-surface-raised p-5">
        <StyledText variant="semibold" className="text-sm text-on-surface">
          {questionsTitle}
        </StyledText>
        <Text className="mt-2 text-sm leading-6 text-on-surface-muted">
          {questionsBody}{" "}
          <Text
            className="text-primary underline font-medium"
            onPress={() => void Linking.openURL(`mailto:${questionsEmail}`)}
          >
            {questionsEmail}
          </Text>
          .
        </Text>
        <Link href="/(public)/welcome" asChild>
          <Pressable
            accessibilityRole="link"
            className="mt-4 h-10 flex-row items-center gap-2 self-start rounded-xl bg-surface-sunken px-3 active:opacity-70"
          >
            <ChevronLeft size={16} className="text-primary" />
            <Text className="text-sm font-semibold text-primary">
              Back to Takda
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
