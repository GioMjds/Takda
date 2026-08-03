import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { z } from "zod";
import { type UserPublic } from "@/services/auth";
import { usersService } from "@/services/users";
import { handleActionError } from "@/configs/fetch";
import { FormError, StyledText } from "@/components";
import { useAuthStore } from "@/stores/auth";

const CompleteProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(200),
  lastName: z.string().min(1, "Last name is required").max(200),
});
type CompleteProfileDto = z.infer<typeof CompleteProfileSchema>;


function NameInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      <StyledText variant="medium" className="text-sm text-on-surface">
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
          autoCapitalize="words"
          textContentType="name"
          placeholderTextColor="#8fa89b"
          className="flex-1 text-base text-on-surface"
          style={{ fontFamily: "Manrope-Regular" }}
        />
      </View>
      {error ? (
        <Text className="text-xs text-danger" style={{ fontFamily: "Manrope-Regular" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

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
      allowsEditing: true,
      aspect: [1, 1],
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
      if (avatarUri) {
        const userWithAvatar = await usersService.uploadAvatar(avatarUri);
        refreshUser(userWithAvatar);
      } else {
        refreshUser(updated);
      }
      router.replace('/');
    } catch (err) {
      const mapped = handleActionError(err);
      setServerMessage(mapped.message);
      setServerDetails(mapped.errors ?? null);
    } finally {
      setSubmitting(false);
    }
  }

  const initials =
    ((currentUser?.firstName?.[0] ?? "") + (currentUser?.lastName?.[0] ?? "")).toUpperCase() ||
    "?";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-surface"
    >
      {/* Brand strip */}
      <View className="items-center bg-primary-500 pb-6 pt-14">
        <StyledText variant="extrabold" className="text-lg tracking-tight text-white">
          Almost there!
        </StyledText>
        <Text className="mt-0.5 text-sm text-white/70" style={{ fontFamily: "Manrope-Regular" }}>
          Let&apos;s personalise your account
        </Text>

        {/* Avatar picker — sits below the strip, overlapping the card */}
        <Pressable
          onPress={pickAvatar}
          accessibilityLabel={avatarUri ? "Change profile photo" : "Add profile photo"}
          accessibilityRole="button"
          className="absolute -bottom-12 self-center"
        >
          <View
            className="h-24 w-24 overflow-hidden rounded-full border-4 border-surface bg-surface-sunken"
            style={{ elevation: 4 }}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-primary-100">
                <StyledText variant="extrabold" className="text-2xl text-primary-600">
                  {initials}
                </StyledText>
              </View>
            )}
          </View>
          {/* Camera badge */}
          <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-accent-500 shadow-card">
            <Ionicons name="camera" size={14} color="#ffffff" />
          </View>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Space below avatar */}
        <View className="mb-6 mt-14">
          <Text className="text-center text-xs text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            Tap the photo to {avatarUri ? "change" : "add"} your picture
          </Text>
        </View>

        {serverMessage || serverDetails ? (
          <View className="mb-4">
            <FormError message={serverMessage} errors={serverDetails} />
          </View>
        ) : null}

        <View className="gap-4">
          <Controller
            control={control}
            name="firstName"
            render={({ field, fieldState }) => (
              <NameInput
                label="First name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="lastName"
            render={({ field, fieldState }) => (
              <NameInput
                label="Last name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>

        {/* Info card */}
        <View className="mt-5 flex-row items-start gap-2 rounded-xl bg-primary-50 p-4">
          <Ionicons name="information-circle" size={18} color="#0f7a4a" />
          <Text className="flex-1 text-xs leading-5 text-primary-700" style={{ fontFamily: "Manrope-Regular" }}>
            Your name is shown to customers when they join your queue and receive notifications.
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
              {submitting ? "Saving..." : "Save and continue"}
            </StyledText>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.replace("/(auth)/sign-in")}
          className="mt-4 items-center py-2"
          accessibilityRole="button"
        >
          <Text className="text-sm text-on-surface-muted" style={{ fontFamily: "Manrope-Regular" }}>
            Skip for now
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
