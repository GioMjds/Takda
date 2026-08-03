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
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  RegisterBusinessOwnerSchema,
  authService,
  type RegisterBusinessOwnerDto,
} from "@/services/auth";
import { handleActionError } from "@/configs/fetch";
import { FormError, StyledText } from "@/components";


type SignUpField = {
  name: keyof RegisterBusinessOwnerDto;
  label: string;
  textContentType?: TextInputProps["textContentType"];
} & Pick<TextInputProps, "autoCapitalize" | "keyboardType" | "secureTextEntry">;

const SIGN_UP_FIELDS = [
  {
    name: "firstName",
    label: "First name",
    autoCapitalize: "words",
    textContentType: "name",
  },
  {
    name: "lastName",
    label: "Last name",
    autoCapitalize: "words",
    textContentType: "familyName",
  },
  {
    name: "tenantName",
    label: "Business name",
    autoCapitalize: "words",
    textContentType: "organizationName",
  },
  {
    name: "email",
    label: "Email",
    autoCapitalize: "none",
    keyboardType: "email-address",
    textContentType: "emailAddress",
  },
  {
    name: "password",
    label: "Password",
    secureTextEntry: true,
    textContentType: "newPassword",
  },
] satisfies SignUpField[];


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
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  placeholder?: string;
  textContentType?: TextInputProps["textContentType"];
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
        {isSubmitting ? "Creating account..." : label}
      </StyledText>
    </Pressable>
  );
}

export default function SignUp() {
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<Record<
    string,
    string[]
  > | null>(null);

  const { control, handleSubmit, formState } =
    useForm<RegisterBusinessOwnerDto>({
      resolver: zodResolver(RegisterBusinessOwnerSchema),
      defaultValues: {
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        tenantName: "",
      },
      mode: "onBlur",
    });

  async function onSubmit(values: RegisterBusinessOwnerDto) {
    setSubmitting(true);
    setServerMessage(null);
    setServerDetails(null);
    try {
      await authService.register(values);
      router.replace({ pathname: "/(auth)/otp", params: { email: values.email } });
    } catch (err) {
      const mapped = handleActionError(err);
      setServerMessage(mapped.message);
      setServerDetails(mapped.errors ?? null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-surface"
    >
      {/* Back button + header */}
      <View className="flex-row items-center gap-3 bg-surface px-4 pb-4 pt-14">
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
          Create your business
        </StyledText>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <View className="mb-6 flex-row items-center gap-2">
          <View className="h-1.5 flex-1 rounded-full bg-primary-500" />
          <View className="h-1.5 flex-1 rounded-full bg-border" />
          <View className="h-1.5 flex-1 rounded-full bg-border" />
        </View>

        <Text className="mb-6 text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
          Set up your business account in less than a minute.
        </Text>

        {serverMessage || serverDetails ? (
          <View className="mb-4">
            <FormError message={serverMessage} errors={serverDetails} />
          </View>
        ) : null}

        <View className="gap-4">
          {SIGN_UP_FIELDS.map((f) => (
            <Controller
              key={f.name}
              control={control}
              name={f.name}
              render={({ field, fieldState }) => (
                <AuthInput
                  label={f.label}
                  value={String(field.value ?? "")}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  autoCapitalize={f.autoCapitalize}
                  keyboardType={f.keyboardType}
                  secureTextEntry={f.secureTextEntry}
                  textContentType={f.textContentType}
                />
              )}
            />
          ))}
        </View>

        <View className="mt-8">
          <PrimaryButton
            label="Create account"
            onPress={handleSubmit(onSubmit)}
            isSubmitting={submitting}
            disabled={!formState.isValid}
          />
        </View>

        <Text className="mt-5 text-center text-xs text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
          By creating an account, you agree to our{" "}
          <Link href="/(public)/terms">
            <Text className="text-primary-500" style={{ fontFamily: "Manrope-SemiBold" }}>Terms</Text>
          </Link>
          {" "}and{" "}
          <Link href="/(public)/privacy">
            <Text className="text-primary-500" style={{ fontFamily: "Manrope-SemiBold" }}>Privacy Policy</Text>
          </Link>
          .
        </Text>

        <View className="mt-4 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            Already have an account?
          </Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-sm text-primary-500" style={{ fontFamily: "Manrope-SemiBold" }}>
              Sign in
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
