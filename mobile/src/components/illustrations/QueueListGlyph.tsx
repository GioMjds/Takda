import { Circle, Path } from "react-native-svg";
import { StyledSvg, type IllustrationProps } from "./types";

export function QueueListGlyph({ size = 24, ...rest }: IllustrationProps) {
  return (
    <StyledSvg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Circle cx="5" cy="6" r="2" stroke="currentColor" strokeWidth="1.75" />
      <Circle cx="5" cy="12" r="2" stroke="currentColor" strokeWidth="1.75" />
      <Circle cx="5" cy="18" r="2" stroke="currentColor" strokeWidth="1.75" />
      <Path
        d="M10 6h11M10 12h11M10 18h11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </StyledSvg>
  );
}
