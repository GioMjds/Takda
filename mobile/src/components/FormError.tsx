import { View } from "react-native";
import { StyledText } from "./StyledText";

export interface FormErrorProps {
  message?: string | null;
  errors?: Record<string, string[]> | null;
}

export function FormError({ message, errors }: FormErrorProps) {
  if (!message && !errors) return null;

  const fieldEntries = errors ? Object.entries(errors) : [];

  return (
    <View
      accessibilityRole="alert"
      className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
    >
      {message ? (
        <StyledText
          variant="light"
          className="text-sm font-medium text-red-800 dark:text-red-200"
        >
          {message}
        </StyledText>
      ) : null}
      {fieldEntries.length > 0 ? (
        <View className="mt-2 gap-1">
          {fieldEntries.map(([field, messages]) => (
            <StyledText
              variant="light"
              key={field}
              className="text-xs text-red-700 dark:text-red-300"
            >
              {field}: {messages.join(", ")}
            </StyledText>
          ))}
        </View>
      ) : null}
    </View>
  );
}
