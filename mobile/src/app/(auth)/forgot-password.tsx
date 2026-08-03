import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ForgotPasswordSchema,
  authService,
  type ForgotPasswordDto,
} from "@/services/auth";
import { handleActionError } from "@/configs/fetch";
import { FormError, StyledText } from "@/components";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}


export default function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const { control, handleSubmit, formState } = useForm<ForgotPasswordDto>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: ForgotPasswordDto) {
    setSubmitting(true);
    setServerMessage(null);
    try {
      await authService.forgotPassword(values);
      setSentTo(values.email);
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      if (status === 429) {
        setServerMessage("Too many requests. Try again in 15 minutes.");
      } else {
        setServerMessage(handleActionError(err).message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <View className="flex-1 bg-surface">
        <View className="flex-row items-center gap-3 px-4 pb-4 pt-14">
          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Back to sign in"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken"
          >
            <Ionicons name="arrow-back" size={20} color="#0f1f17" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          {/* Success illustration */}
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
            <Ionicons name="mail-open-outline" size={40} color="#0f7a4a" />
          </View>
          <StyledText variant="extrabold" className="text-center text-2xl text-foreground">
            Check your inbox
          </StyledText>
          <Text className="mt-3 text-center text-sm leading-6 text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            If an account exists for{" "}
            <Text className="text-foreground" style={{ fontFamily: "Manrope-SemiBold" }}>
              {maskEmail(sentTo)}
            </Text>
            {", "}we&apos;ve sent password reset instructions.{"\n"}
            The link expires in{" "}
            <Text className="text-foreground" style={{ fontFamily: "Manrope-SemiBold" }}>
              15 minutes
            </Text>
            .
          </Text>

          <View className="mt-10 w-full gap-3">
            <Link href="/(auth)/sign-in" asChild>
              <Pressable
                className="h-13 items-center justify-center rounded-full bg-primary-500"
                style={{ height: 52, borderRadius: 26 }}
                accessibilityRole="button"
              >
                <StyledText variant="bold" className="text-base text-white">
                  Back to sign in
                </StyledText>
              </Pressable>
            </Link>
            <Pressable
              onPress={() => setSentTo(null)}
              className="items-center py-3"
              accessibilityRole="button"
            >
              <Text className="text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
                Didn&apos;t receive it?{" "}
                <Text className="text-primary-500" style={{ fontFamily: "Manrope-SemiBold" }}>
                  Try again
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-surface"
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pb-4 pt-14">
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken"
        >
          <Ionicons name="arrow-back" size={20} color="#0f1f17" />
        </Pressable>
        <StyledText variant="extrabold" className="text-xl text-foreground">
          Reset password
        </StyledText>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View className="mb-6 mt-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
          <Ionicons name="lock-closed-outline" size={28} color="#0f7a4a" />
        </View>

        <StyledText variant="bold" className="text-lg text-foreground">
          Forgot your password?
        </StyledText>
        <Text className="mt-1 text-sm leading-6 text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
          No worries. Enter your email and we&apos;ll send you a reset link.
        </Text>

        {serverMessage ? (
          <View className="mt-5">
            <FormError message={serverMessage} />
          </View>
        ) : null}

        <View className="mt-6 gap-1.5">
          <StyledText variant="medium" className="text-sm text-foreground">
            Email address
          </StyledText>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <View className="gap-1.5">
                <View
                  className={`flex-row items-center rounded-xl border bg-surface-raised px-4 ${
                    fieldState.error
                      ? "border-danger"
                      : focused
                        ? "border-primary-500"
                        : "border-border"
                  }`}
                  style={{ height: 52 }}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={focused ? "#0f7a4a" : "#8fa89b"}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={() => {
                      setFocused(false);
                      field.onBlur();
                    }}
                    onFocus={() => setFocused(true)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@business.com"
                    placeholderTextColor="#8fa89b"
                    textContentType="emailAddress"
                    className="flex-1 text-base text-foreground"
                    style={{ fontFamily: "Manrope-Regular" }}
                  />
                </View>
                {fieldState.error ? (
                  <Text className="text-xs text-danger" style={{ fontFamily: "Manrope-Regular" }}>
                    {fieldState.error.message}
                  </Text>
                ) : null}
              </View>
            )}
          />
        </View>

        <View className="mt-8">
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={submitting || !formState.isValid}
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: !formState.isValid }}
            style={({ pressed }) => ([
              {
                height: 52,
                borderRadius: 26,
                transform: [{ scale: pressed && !submitting && formState.isValid ? 0.97 : 1 }],
              },
            ])}
            className={`items-center justify-center bg-primary-500 ${
              submitting || !formState.isValid ? "opacity-50" : ""
            }`}
          >
            <StyledText variant="bold" className="text-base text-white">
              {submitting ? "Sending..." : "Send reset link"}
            </StyledText>
          </Pressable>
        </View>

        <Pressable onPress={() => router.back()} className="mt-5 items-center py-2" accessibilityRole="button">
          <Text className="text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            Remember it?{" "}
            <Text className="text-primary-500" style={{ fontFamily: "Manrope-SemiBold" }}>
              Back to sign in
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
