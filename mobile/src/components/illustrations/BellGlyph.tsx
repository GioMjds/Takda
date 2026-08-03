import { Path, Circle } from "react-native-svg";
import { StyledSvg, type IllustrationProps } from "./types";

export function BellGlyph({ size = 24, ...rest }: IllustrationProps) {
  return (
    <StyledSvg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <Path
        d="M10 20a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <Circle cx="18" cy="6" r="2.5" fill="currentColor" />
    </StyledSvg>
  );
}
