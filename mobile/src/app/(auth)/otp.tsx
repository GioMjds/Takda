import { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { StyledText } from "@/components";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/stores/auth";
import { handleActionError } from "@/configs/fetch";

const OTP_LENGTH = 6;

function OtpBox({
  value,
  isFocused,
  hasError,
}: {
  value: string;
  isFocused: boolean;
  hasError: boolean;
}) {
  const borderColor = hasError
    ? "border-danger"
    : isFocused
      ? "border-primary-500"
      : value
        ? "border-primary-300"
        : "border-border";
  const bgColor = isFocused ? "bg-surface-raised" : value ? "bg-surface-raised" : "bg-surface-sunken";

  return (
    <View
      className={`h-14 w-12 items-center justify-center rounded-xl border-2 ${borderColor} ${bgColor}`}
    >
      {value ? (
        <StyledText variant="extrabold" className="text-2xl text-on-surface">
          {value}
        </StyledText>
      ) : isFocused ? (
        <View className="h-5 w-0.5 bg-primary-500" />
      ) : null}
    </View>
  );
}

export default function Otp() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));

  function handleChange(text: string) {
    const digits = text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    setHasError(false);
    setErrorMessage(null);
    setCode(digits);
    if (digits.length === OTP_LENGTH) {
      Keyboard.dismiss();
    }
  }

  const triggerShake = () => {
    runOnUI(() => {
      "worklet";
      shakeAnim.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    })();
  };

  const isComplete = code.length === OTP_LENGTH;

  async function onVerify() {
    if (code.length < OTP_LENGTH) return;
    setSubmitting(true);
    setHasError(false);
    setErrorMessage(null);
    try {
      const result = await authService.verifyOtp({ email, code });
      await useAuthStore.getState().signIn(result.accessToken, result.refreshToken, result.user);
      router.replace("/(auth)/complete-profile");
    } catch (err) {
      const mapped = handleActionError(err);
      setHasError(true);
      setErrorMessage(mapped.message);
      triggerShake();
      setCode("");
    } finally {
      setSubmitting(false);
    }
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
        <StyledText variant="extrabold" className="text-xl text-on-surface">
          Verify your email
        </StyledText>
      </View>

      <View className="flex-1 px-6 pt-4">
        {/* Icon */}
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
          <Ionicons name="mail-open-outline" size={28} color="#0f7a4a" />
        </View>

        <StyledText variant="bold" className="text-lg text-on-surface">
          Enter the 6-digit code
        </StyledText>
        {email ? (
          <Text className="mt-1 text-sm leading-6 text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            Sent to{" "}
            <Text className="text-on-surface" style={{ fontFamily: "Manrope-SemiBold" }}>
              {email}
            </Text>
            . It expires in 10 minutes.
          </Text>
        ) : (
          <Text className="mt-1 text-sm leading-6 text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            Check your email for the verification code. It expires in 10 minutes.
          </Text>
        )}

        {/* OTP boxes — tapping any box focuses the hidden input */}
        <Pressable
          onPress={() => inputRef.current?.focus()}
          accessibilityLabel="OTP entry"
          className="mt-8"
        >
          <Animated.View style={shakeStyle} className="flex-row justify-between">
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <OtpBox
                key={i}
                value={code[i] ?? ""}
                isFocused={inputFocused && i === Math.min(code.length, OTP_LENGTH - 1)}
                hasError={hasError}
              />
            ))}
          </Animated.View>
        </Pressable>

        {/* Hidden input that captures actual keystrokes */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          className="absolute opacity-0"
          style={{ height: 0, width: 0 }}
          accessibilityLabel="OTP input field"
        />

        {hasError ? (
          <Text className="mt-3 text-center text-sm text-danger" style={{ fontFamily: "Manrope-Medium" }}>
            {errorMessage ?? "Incorrect code. Please try again."}
          </Text>
        ) : null}

        <View className="mt-8">
          <Pressable
            onPress={onVerify}
            disabled={!isComplete || submitting}
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: !isComplete }}
            style={({ pressed }) => ({
              height: 52,
              borderRadius: 26,
              transform: [{ scale: pressed && isComplete && !submitting ? 0.97 : 1 }],
            })}
            className={`items-center justify-center bg-primary-500 ${
              !isComplete || submitting ? "opacity-50" : ""
            }`}
          >
            <StyledText variant="bold" className="text-base text-white">
              {submitting ? "Verifying..." : "Verify code"}
            </StyledText>
          </Pressable>
        </View>

        {/* Resend */}
        <Pressable
          onPress={async () => {
            setCode("");
            setHasError(false);
            if (email) {
              try {
                await authService.requestOtp({ email });
              } catch {
                // handle error if needed
              }
            }
          }}
          className="mt-5 items-center py-2"
          accessibilityRole="button"
        >
          <Text className="text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            Didn&apos;t receive it?{" "}
            <Text className="text-primary-500" style={{ fontFamily: "Manrope-SemiBold" }}>
              Resend code
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
