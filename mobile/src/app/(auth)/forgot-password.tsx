import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ForgotPasswordSchema,
  authService,
  type ForgotPasswordDto,
} from "@/services/auth";
import { handleActionError } from "@/configs/fetch";
import { FormError, SubmitButton, StyledText } from "@/components";

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
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="px-6 py-16"
      >
        <StyledText variant="bold" className="text-2xl text-foreground">
          Check your inbox
        </StyledText>
        <Text className="mt-3 text-sm leading-6 text-foreground">
          If an account exists for {maskEmail(sentTo)}, we&apos;ve sent password
          reset instructions. The link expires in 15 minutes.
        </Text>
        <Link href="/(auth)/sign-in" className="mt-8">
          <Text className="text-sm text-primary">Back to sign in</Text>
        </Link>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-surface"
    >
      <ScrollView
        contentContainerClassName="px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <StyledText variant="bold" className="text-2xl text-foreground">
          Forgot your password?
        </StyledText>
        <Text className="mt-2 text-sm text-foreground/60">
          Enter your email and we&apos;ll send you a reset link.
        </Text>

        <FormError message={serverMessage} />

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <View className="mt-6">
              <Text className="mb-1 text-sm text-foreground">Email</Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@business.com"
                className="h-12 rounded-md border border-border bg-background px-3 text-base text-foreground"
              />
              {fieldState.error ? (
                <Text className="mt-1 text-xs text-red-600">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <View className="mt-8">
          <SubmitButton
            label="Send reset link"
            onPress={handleSubmit(onSubmit)}
            isSubmitting={submitting}
            disabled={!formState.isValid}
          />
        </View>

        <Link href="/(auth)/sign-in" className="mt-6">
          <Text className="text-sm text-primary">Back to sign in</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
