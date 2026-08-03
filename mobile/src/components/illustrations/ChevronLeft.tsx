import { Path } from "react-native-svg";
import { StyledSvg, type IllustrationProps } from "./types";

export function ChevronLeft({ size = 24, ...rest }: IllustrationProps) {
  return (
    <StyledSvg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StyledSvg>
  );
}
