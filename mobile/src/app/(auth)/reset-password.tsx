import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { authService } from "@/services/auth";
import { handleActionError } from "@/configs/fetch";
import { FormError, SubmitButton, StyledText } from "@/components";
import { useAuthStore } from "@/stores";

const ResetFormSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
type ResetForm = z.infer<typeof ResetFormSchema>;

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";

  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const signIn = useAuthStore((s) => s.signIn);

  const defaultValues = useMemo<ResetForm>(
    () => ({ newPassword: "", confirmPassword: "" }),
    [],
  );

  const { control, handleSubmit, formState } = useForm<ResetForm>({
    resolver: zodResolver(ResetFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  async function onSubmit(values: ResetForm) {
    if (!token) return;
    setSubmitting(true);
    setServerMessage(null);
    try {
      const result = await authService.resetPassword({
        token,
        newPassword: values.newPassword,
      });
      await signIn(result.accessToken, result.refreshToken, result.user);
    } catch (err) {
      setServerMessage(handleActionError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="px-6 py-16"
      >
        <StyledText variant="bold" className="text-2xl text-foreground">
          Invalid reset link
        </StyledText>
        <Text className="mt-3 text-sm leading-6 text-foreground">
          The reset link is missing a token. Request a new one from the forgot
          password screen.
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
          Reset your password
        </StyledText>
        <Text className="mt-2 text-sm text-foreground/60">
          Choose a new password. You&apos;ll be signed in when it succeeds.
        </Text>

        <FormError message={serverMessage} />

        <Controller
          control={control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <View className="mt-6">
              <Text className="mb-1 text-sm text-foreground">New password</Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry
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

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <View className="mt-4">
              <Text className="mb-1 text-sm text-foreground">
                Confirm password
              </Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry
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
            label="Update password"
            onPress={handleSubmit(onSubmit)}
            isSubmitting={submitting}
            disabled={!formState.isValid}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
