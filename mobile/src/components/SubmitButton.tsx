import { ActivityIndicator, Pressable } from "react-native";
import { StyledText } from "./StyledText";

export interface SubmitButtonProps {
  label: string;
  onPress: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

export function SubmitButton({
  label,
  onPress,
  isSubmitting,
  disabled,
}: SubmitButtonProps) {
  const isDisabled = isSubmitting || disabled === true;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ busy: isSubmitting, disabled: isDisabled }}
      className={`h-12 items-center justify-center rounded-md bg-primary active:opacity-80 ${
        isDisabled ? "opacity-60" : ""
      }`}
    >
      {isSubmitting ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <StyledText
          variant="light"
          className="text-base font-semibold text-white"
        >
          {label}
        </StyledText>
      )}
    </Pressable>
  );
}
