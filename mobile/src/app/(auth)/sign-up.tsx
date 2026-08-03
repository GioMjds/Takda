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
  type TextInputProps,
  View,
} from "react-native";
import {
  RegisterBusinessOwnerSchema,
  authService,
  type RegisterBusinessOwnerDto,
} from "@/services";
import { handleActionError } from "@/configs";
import { FormError, SubmitButton, StyledText } from "@/components";
import { useAuthStore } from "@/stores";

type SignUpField = {
  name: keyof RegisterBusinessOwnerDto;
  label: string;
} & Pick<TextInputProps, "autoCapitalize" | "keyboardType" | "secureTextEntry">;

const SIGN_UP_FIELDS = [
  { name: "firstName", label: "First name", autoCapitalize: "words" },
  { name: "lastName", label: "Last name", autoCapitalize: "words" },
  { name: "tenantName", label: "Business name", autoCapitalize: "words" },
  {
    name: "email",
    label: "Email",
    autoCapitalize: "none",
    keyboardType: "email-address",
  },
  { name: "password", label: "Password", secureTextEntry: true },
] satisfies SignUpField[];

export default function SignUp() {
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<Record<
    string,
    string[]
  > | null>(null);
  const signIn = useAuthStore((s) => s.signIn);

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
      const result = await authService.register(values);
      await signIn(result.accessToken, result.refreshToken, result.user);
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
      <ScrollView
        contentContainerClassName="px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <StyledText variant="extrabold" className="text-3xl text-foreground">
          Create your business
        </StyledText>
        <Text className="mt-2 text-sm text-foreground/60">
          Set up your business account in less than a minute.
        </Text>

        <FormError message={serverMessage} errors={serverDetails} />

        <View className="mt-6 gap-4">
          {SIGN_UP_FIELDS.map((f) => (
            <Controller
              key={f.name}
              control={control}
              name={f.name}
              render={({ field, fieldState }) => (
                <View>
                  <Text className="mb-1 text-sm text-foreground">
                    {f.label}
                  </Text>
                  <TextInput
                    value={String(field.value ?? "")}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    autoCapitalize={f.autoCapitalize}
                    keyboardType={f.keyboardType}
                    secureTextEntry={f.secureTextEntry}
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
          ))}
        </View>

        <View className="mt-8">
          <SubmitButton
            label="Create account"
            onPress={handleSubmit(onSubmit)}
            isSubmitting={submitting}
            disabled={!formState.isValid}
          />
        </View>

        <Text className="mt-4 text-center text-xs text-foreground/60">
          By creating an account, you agree to our{" "}
          <Link href="/(public)/terms">
            <Text className="text-primary">Terms</Text>
          </Link>{" "}
          and{" "}
          <Link href="/(public)/privacy">
            <Text className="text-primary">Privacy Policy</Text>
          </Link>
          .
        </Text>

        <View className="mt-4 items-center">
          <Link href="/(auth)/sign-in">
            <Text className="text-sm text-primary">
              Already have an account? Sign in
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
