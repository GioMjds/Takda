import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocalSearchParams, router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "@/services/auth";
import { handleActionError } from "@/configs/fetch";
import { FormError, StyledText } from "@/components";
import { useAuthStore } from "@/stores/auth";

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


function PasswordInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  textContentType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  error?: string;
  textContentType?: "password" | "newPassword";
}) {
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      <StyledText variant="medium" className="text-sm text-foreground">
        {label}
      </StyledText>
      <View
        className={`flex-row items-center rounded-xl border bg-surface-raised px-4 ${
          error
            ? "border-danger"
            : focused
              ? "border-primary-500"
              : "border-border"
        }`}
        style={{ height: 52 }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={() => {
            setFocused(false);
            onBlur();
          }}
          onFocus={() => setFocused(true)}
          secureTextEntry={!showPass}
          textContentType={textContentType}
          placeholderTextColor="#8fa89b"
          className="flex-1 text-base text-foreground"
          style={{ fontFamily: "Manrope-Regular" }}
        />
        <Pressable
          onPress={() => setShowPass((p) => !p)}
          accessibilityLabel={showPass ? "Hide password" : "Show password"}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name={showPass ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#8fa89b"
          />
        </Pressable>
      </View>
      {error ? (
        <Text className="text-xs text-danger" style={{ fontFamily: "Manrope-Regular" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";

  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
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
      setDone(true);
      await signIn(result.accessToken, result.refreshToken, result.user);
    } catch (err) {
      setServerMessage(handleActionError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
          <Ionicons name="checkmark-circle-outline" size={44} color="#0f7a4a" />
        </View>
        <StyledText variant="extrabold" className="text-center text-2xl text-foreground">
          Password updated!
        </StyledText>
        <Text className="mt-3 text-center text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
          You&apos;re all set. You&apos;ll be taken to your dashboard momentarily.
        </Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-surface-sunken">
          <Ionicons name="alert-circle-outline" size={40} color="#b3261e" />
        </View>
        <StyledText variant="extrabold" className="text-center text-2xl text-foreground">
          Invalid reset link
        </StyledText>
        <Text className="mt-3 text-center text-sm leading-6 text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
          The reset link is missing or has expired. Request a new one from the forgot password screen.
        </Text>
        <Pressable className="mt-8" onPress={() => router.replace("/(auth)/forgot-password")} accessibilityRole="button">
          <View className="rounded-full bg-primary-500 px-8 py-3" style={{ height: 48 }}>
            <StyledText variant="bold" className="text-base text-white">
              Request new link
            </StyledText>
          </View>
        </Pressable>
        <Link href="/(auth)/sign-in" className="mt-4">
          <Text className="text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            Back to{" "}
            <Text className="text-primary-500" style={{ fontFamily: "Manrope-SemiBold" }}>
              sign in
            </Text>
          </Text>
        </Link>
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
          New password
        </StyledText>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 mt-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
          <Ionicons name="shield-checkmark-outline" size={28} color="#0f7a4a" />
        </View>

        <StyledText variant="bold" className="text-lg text-foreground">
          Set your new password
        </StyledText>
        <Text className="mt-1 text-sm leading-6 text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
          Choose a strong password. You&apos;ll be signed in automatically once it succeeds.
        </Text>

        {serverMessage ? (
          <View className="mt-5">
            <FormError message={serverMessage} />
          </View>
        ) : null}

        <View className="mt-6 gap-4">
          <Controller
            control={control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <PasswordInput
                label="New password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                textContentType="newPassword"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <PasswordInput
                label="Confirm new password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                textContentType="password"
              />
            )}
          />
        </View>

        {/* Password requirements hint */}
        <View className="mt-3 flex-row items-center gap-1.5">
          <Ionicons name="information-circle-outline" size={14} color="#8fa89b" />
          <Text className="text-xs text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            At least 8 characters required
          </Text>
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
              {submitting ? "Updating..." : "Update password"}
            </StyledText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
