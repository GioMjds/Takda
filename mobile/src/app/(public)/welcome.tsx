import { useEffect } from "react";
import { router, Link, Href } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAuthStore } from "@/stores/auth";
import { PublicScreen, StyledText } from "@/components";
import {
  QueueScene,
  CalendarGlyph,
  QueueListGlyph,
  BellGlyph,
  ChevronRight,
} from "@/components/illustrations";

const BUSINESS_HOME = "/(business)/(tabs)/dashboard" as Href;

type ValueCard = {
  Icon: typeof CalendarGlyph;
  title: string;
  description: string;
  label: string;
};

const VALUE_CARDS = [
  {
    Icon: CalendarGlyph,
    title: "Book a slot",
    description: "Pick a time, drop your name + phone.",
    label: "Book a slot. Pick a time, drop your name and phone.",
  },
  {
    Icon: QueueListGlyph,
    title: "Live queue",
    description: "See your position update in real time.",
    label: "Live queue. See your position update in real time.",
  },
  {
    Icon: BellGlyph,
    title: "SMS reminders",
    description: "No one forgets, no-shows drop.",
    label: "SMS reminders. No one forgets and no-shows drop.",
  },
] satisfies ValueCard[];

export default function Welcome() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(BUSINESS_HOME);
    }
  }, [status]);

  return (
    <PublicScreen>
      <View className="items-center">
        <StyledText
          variant="semibold"
          className="text-2xl tracking-tight text-primary"
        >
          Takda
        </StyledText>
      </View>

      <View className="mt-8 items-center">
        <QueueScene size={200} className="text-primary" />
        <View className="absolute" style={{ top: 24, right: 72 }}>
          <View className="h-2 w-2 rounded-full bg-accent-500" />
        </View>
      </View>

      <View className="mt-6 items-center">
        <StyledText
          variant="extrabold"
          className="text-center text-4xl leading-tight text-on-surface"
          accessibilityRole="header"
        >
          Skip the line.
        </StyledText>
        <StyledText
          variant="extrabold"
          className="mt-1 text-center text-4xl leading-tight text-on-surface"
          accessibilityRole="header"
        >
          Book in 10 seconds.
        </StyledText>
        <Text className="mt-3 px-2 text-center text-base leading-6 text-on-surface-muted">
          Run your walk-in queue. Customers scan, book, and show up. You keep
          the line moving.
        </Text>
      </View>

      <View className="mt-10 w-full gap-3">
        <Link href="/(auth)/sign-in" asChild>
          <Pressable
            accessibilityRole="button"
            className="h-14 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-90"
          >
            <Text className="text-base font-semibold text-white">Sign in</Text>
            <ChevronRight size={18} className="text-white" />
          </Pressable>
        </Link>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable
            accessibilityRole="button"
            className="h-14 w-full items-center justify-center rounded-2xl border border-border bg-surface-raised active:opacity-90"
          >
            <Text className="text-base font-semibold text-on-surface">
              Create a business account
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="mt-8 gap-3">
        {VALUE_CARDS.map(({ Icon, title, description, label }) => (
          <View
            key={title}
            accessibilityRole="summary"
            accessibilityLabel={label}
            className="flex-row items-center gap-4 rounded-xl bg-surface-raised p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-100">
              <Icon size={20} className="text-accent-700" />
            </View>
            <View className="flex-1">
              <StyledText
                variant="semibold"
                className="text-sm text-on-surface"
              >
                {title}
              </StyledText>
              <Text className="mt-0.5 text-xs leading-5 text-on-surface-muted">
                {description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-10 flex-row items-center justify-center gap-6 pb-8">
        <Link href="/(public)/about">
          <Text className="text-sm text-on-surface-muted">About</Text>
        </Link>
        <Text className="text-sm text-on-surface-muted">·</Text>
        <Link href="/(public)/terms">
          <Text className="text-sm text-on-surface-muted">Terms</Text>
        </Link>
        <Text className="text-sm text-on-surface-muted">·</Text>
        <Link href="/(public)/privacy">
          <Text className="text-sm text-on-surface-muted">Privacy</Text>
        </Link>
      </View>
    </PublicScreen>
  );
}
