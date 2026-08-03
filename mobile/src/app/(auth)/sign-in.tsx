import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
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
import { LoginSchema, authService, type LoginDto } from "@/services/auth";
import { useAuthStore } from "@/stores/auth";
import { handleActionError } from "@/configs/fetch";
import { FormError, StyledText } from "@/components";
import { LoginError } from "./_types";

function mapLoginError(err: unknown): LoginError {
  const mapped = handleActionError(err);
  const status = (err as { status?: number } | null)?.status;
  if (status === 401) {
    return { message: "Email or password is incorrect." };
  }
  if (status === 429) {
    return { message: "Too many attempts. Try again in 15 minutes." };
  }
  if (status === 0) {
    return {
      message: "Can't reach the server. Check your connection and try again.",
    };
  }
  return mapped;
}


function AuthInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  placeholder,
  textContentType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default";
  autoCapitalize?: "none" | "words" | "sentences";
  placeholder?: string;
  textContentType?: "emailAddress" | "password" | "newPassword" | "name";
}) {
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(false);

  const isPassword = secureTextEntry === true;
  const borderColor = error
    ? "border-danger"
    : focused
      ? "border-primary-500"
      : "border-border";

  return (
    <View className="gap-1.5">
      <StyledText variant="medium" className="text-sm text-foreground">
        {label}
      </StyledText>
      <View
        className={`flex-row items-center rounded-xl border bg-surface-raised px-4 ${borderColor}`}
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
          autoCapitalize={autoCapitalize ?? "none"}
          keyboardType={keyboardType ?? "default"}
          secureTextEntry={isPassword && !showPass}
          placeholder={placeholder}
          placeholderTextColor="#8fa89b"
          textContentType={textContentType}
          className="flex-1 text-base text-foreground"
          style={{ fontFamily: "Manrope-Regular" }}
        />
        {isPassword ? (
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
        ) : null}
      </View>
      {error ? (
        <Text className="text-xs text-danger" style={{ fontFamily: "Manrope-Regular" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  isSubmitting,
  disabled,
}: {
  label: string;
  onPress: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
}) {
  const isDisabled = isSubmitting || disabled === true;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ busy: isSubmitting, disabled: isDisabled }}
      style={({ pressed }) => ([
        {
          height: 52,
          borderRadius: 26,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
        },
      ])}
      className={`items-center justify-center bg-primary-500 ${isDisabled ? "opacity-50" : ""}`}
    >
      <StyledText variant="bold" className="text-base text-white tracking-wide">
        {isSubmitting ? "Signing in..." : label}
      </StyledText>
    </Pressable>
  );
}

export default function SignIn() {
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<Record<
    string,
    string[]
  > | null>(null);
  const signIn = useAuthStore((s) => s.signIn);

  const { control, handleSubmit, formState } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: LoginDto) {
    setSubmitting(true);
    setServerMessage(null);
    setServerDetails(null);
    try {
      const result = await authService.login(values);
      await signIn(result.accessToken, result.refreshToken, result.user);
    } catch (err) {
      const mapped = mapLoginError(err);
      setServerMessage(mapped.message);
      setServerDetails(mapped.details ?? null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-surface"
    >
      {/* Brand panel */}
      <View className="items-center bg-primary-500 pb-10 pt-16">
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <Ionicons name="ticket-outline" size={28} color="#ffffff" />
        </View>
        <StyledText variant="extrabold" className="text-3xl tracking-tight text-white">
          Takda
        </StyledText>
        <Text className="mt-1 text-sm text-white/70" style={{ fontFamily: "Manrope-Regular" }}>
          Your queue, managed effortlessly
        </Text>
      </View>

      {/* Form card */}
      <ScrollView
        contentContainerClassName="px-6 py-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StyledText variant="extrabold" className="text-2xl text-foreground">
          Welcome back
        </StyledText>
        <Text className="mt-1 text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
          Sign in to manage your queue.
        </Text>

        {serverMessage || serverDetails ? (
          <View className="mt-5">
            <FormError message={serverMessage} errors={serverDetails} />
          </View>
        ) : null}

        <View className="mt-6 gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <AuthInput
                label="Email"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="email-address"
                placeholder="you@business.com"
                textContentType="emailAddress"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <AuthInput
                label="Password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secureTextEntry
                placeholder="Your password"
                textContentType="password"
              />
            )}
          />
        </View>

        <Link href="/(auth)/forgot-password" className="mt-3 self-end">
          <Text className="text-sm text-primary-500" style={{ fontFamily: "Manrope-Medium" }}>
            Forgot password?
          </Text>
        </Link>

        <View className="mt-6">
          <PrimaryButton
            label="Sign in"
            onPress={handleSubmit(onSubmit)}
            isSubmitting={submitting}
            disabled={!formState.isValid}
          />
        </View>

        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            New to Takda?
          </Text>
          <Link href="/(auth)/sign-up">
            <Text className="text-sm text-primary-500" style={{ fontFamily: "Manrope-SemiBold" }}>
              Create a business account
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
