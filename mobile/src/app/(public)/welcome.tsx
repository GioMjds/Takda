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
  badgeBg: string;
  iconColor: string;
};

const VALUE_CARDS = [
  {
    Icon: CalendarGlyph,
    title: "Book a slot",
    description: "Pick a time, drop your name + phone.",
    label: "Book a slot. Pick a time, drop your name and phone.",
    badgeBg: "bg-primary-50 dark:bg-primary-950/80",
    iconColor: "text-primary-600 dark:text-primary-400",
  },
  {
    Icon: QueueListGlyph,
    title: "Live queue",
    description: "See your position update in real time.",
    label: "Live queue. See your position update in real time.",
    badgeBg: "bg-accent-100 dark:bg-accent-900/40",
    iconColor: "text-accent-700 dark:text-accent-300",
  },
  {
    Icon: BellGlyph,
    title: "SMS reminders",
    description: "No one forgets, no-shows drop.",
    label: "SMS reminders. No one forgets and no-shows drop.",
    badgeBg: "bg-info/10 dark:bg-info/20",
    iconColor: "text-info",
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
          variant="extrabold"
          className="text-2xl tracking-tight text-primary"
        >
          Takda
        </StyledText>
      </View>

      <View className="mt-6 items-center">
        <QueueScene size={200} className="text-primary" />
        <View className="absolute" style={{ top: 24, right: 72 }}>
          <View className="h-2.5 w-2.5 rounded-full bg-accent-500 shadow-sm" />
        </View>
      </View>

      <View className="mt-6 w-full items-center">
        <StyledText
          variant="extrabold"
          className="w-full text-center text-3xl leading-snug tracking-tight text-on-surface"
          accessibilityRole="header"
        >
          Skip the line.
        </StyledText>
        <StyledText
          variant="extrabold"
          className="mt-0.5 w-full text-center text-3xl leading-snug tracking-tight text-on-surface"
          accessibilityRole="header"
        >
          Book in 10 seconds.
        </StyledText>
        <Text className="mt-3 w-full px-2 text-center text-base leading-relaxed text-on-surface-muted">
          Run your walk-in queue. Customers scan, book, and show up. You keep
          the line moving.
        </Text>
      </View>

      <View className="mt-8 w-full gap-3">
        <Link href="/(auth)/sign-in" asChild>
          <Pressable
            accessibilityRole="button"
            className="h-12 w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-90 shadow-sm"
          >
            <Text className="text-base font-bold text-white">Sign in</Text>
            <ChevronRight size={18} className="text-white" />
          </Pressable>
        </Link>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable
            accessibilityRole="button"
            className="h-12 w-full items-center justify-center rounded-xl border border-border bg-surface-raised active:opacity-90"
          >
            <Text className="text-base font-semibold text-on-surface">
              Create a business account
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="mt-8 w-full gap-3">
        {VALUE_CARDS.map(
          ({ Icon, title, description, label, badgeBg, iconColor }) => (
            <View
              key={title}
              accessibilityRole="summary"
              accessibilityLabel={label}
              className="w-full flex-row items-center gap-4 rounded-xl border border-border/60 bg-surface-raised p-4"
            >
              <View
                className={`h-10 w-10 shrink-0 items-center justify-center rounded-xl ${badgeBg}`}
              >
                <Icon size={20} className={iconColor} />
              </View>
              <View className="flex-1 min-w-0">
                <StyledText
                  variant="semibold"
                  className="text-sm font-semibold text-on-surface"
                >
                  {title}
                </StyledText>
                <Text className="mt-0.5 text-xs leading-5 text-on-surface-muted">
                  {description}
                </Text>
              </View>
            </View>
          ),
        )}
      </View>

      <View className="mt-10 flex-row items-center justify-center gap-6 pb-8">
        <Link href="/(public)/about">
          <Text className="text-sm font-medium text-on-surface-muted hover:text-primary">
            About
          </Text>
        </Link>
        <Text className="text-sm text-on-surface-muted/40">·</Text>
        <Link href="/(public)/terms">
          <Text className="text-sm font-medium text-on-surface-muted hover:text-primary">
            Terms
          </Text>
        </Link>
        <Text className="text-sm text-on-surface-muted/40">·</Text>
        <Link href="/(public)/privacy">
          <Text className="text-sm font-medium text-on-surface-muted hover:text-primary">
            Privacy
          </Text>
        </Link>
      </View>
    </PublicScreen>
  );
}
