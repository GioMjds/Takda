import { Path, Rect } from "react-native-svg";
import { StyledSvg, type IllustrationProps } from "./types";

export function CalendarGlyph({ size = 24, ...rest }: IllustrationProps) {
  return (
    <StyledSvg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <Path d="M3 9h18" stroke="currentColor" strokeWidth="1.75" />
      <Path
        d="M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </StyledSvg>
  );
}
