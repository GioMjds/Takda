import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
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
import { type UserPublic } from "@/services/auth";
import { usersService } from "@/services/users";
import { handleActionError } from "@/configs/fetch";
import { FormError, SubmitButton, StyledText } from "@/components";
import { useAuthStore } from "@/stores";

const CompleteProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(200),
  lastName: z.string().min(1, "Last name is required").max(200),
});
type CompleteProfileDto = z.infer<typeof CompleteProfileSchema>;

export default function CompleteProfile() {
  const currentUser = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<CompleteProfileDto>({
    resolver: zodResolver(CompleteProfileSchema),
    defaultValues: {
      firstName: currentUser?.firstName ?? "",
      lastName: currentUser?.lastName ?? "",
    },
    mode: "onBlur",
  });

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function onSubmit(values: CompleteProfileDto) {
    setSubmitting(true);
    setServerMessage(null);
    setServerDetails(null);
    try {
      const updated: UserPublic = await usersService.updateMe({
        firstName: values.firstName,
        lastName: values.lastName,
      });
      refreshUser(updated);
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
        <StyledText variant="bold" className="text-2xl text-foreground">
          Complete your profile
        </StyledText>
        <Text className="mt-2 text-sm text-foreground/60">
          Add your name so customers and staff know who you are.
        </Text>

        <FormError message={serverMessage} errors={serverDetails} />

        <Pressable
          onPress={pickAvatar}
          className="mt-6 h-24 w-24 items-center justify-center self-center rounded-full border border-dashed border-border bg-background"
        >
          <Text className="text-xs text-foreground/60">
            {avatarUri ? "Change" : "Add photo"}
          </Text>
        </Pressable>

        <Controller
          control={control}
          name="firstName"
          render={({ field, fieldState }) => (
            <View className="mt-6">
              <Text className="mb-1 text-sm text-foreground">First name</Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
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
          name="lastName"
          render={({ field, fieldState }) => (
            <View className="mt-4">
              <Text className="mb-1 text-sm text-foreground">Last name</Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
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
            label="Save"
            onPress={handleSubmit(onSubmit)}
            isSubmitting={submitting}
            disabled={!formState.isValid}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
