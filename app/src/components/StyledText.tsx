import { Text as RNText, TextProps as RNTextProps } from "react-native";

type FontVariant =
  | "bold"
  | "extrabold"
  | "extralight"
  | "light"
  | "medium"
  | "regular"
  | "semibold";

interface StyledTextProps extends RNTextProps {
  variant: FontVariant;
}

const FONT_MAP = {
  bold: "Manrope-Bold",
  extrabold: "Manrope-Bold",
  extralight: "Manrope-ExtraLight",
  light: "Manrope-Light",
  medium: "Manrope-Medium",
  regular: "Manrope-Regular",
  semibold: "Manrope-SemiBold",
} satisfies Record<FontVariant, string>;

export function StyledText({
  variant = "regular",
  style,
  children,
  ...rest
}: StyledTextProps) {
  return (
    <RNText {...rest} style={[{ fontFamily: FONT_MAP[variant] }, style]}>
      {children}
    </RNText>
  );
}
