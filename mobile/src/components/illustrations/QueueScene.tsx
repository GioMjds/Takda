import { Circle, Path, Rect } from "react-native-svg";
import { StyledSvg, type IllustrationProps } from "./types";

export function QueueScene({ size = 200, ...rest }: IllustrationProps) {
  return (
    <StyledSvg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      {...rest}
    >
      {/* Counter base */}
      <Rect
        x="20"
        y="150"
        width="160"
        height="14"
        rx="3"
        fill="currentColor"
        opacity="0.12"
      />
      <Rect
        x="20"
        y="164"
        width="160"
        height="4"
        rx="2"
        fill="currentColor"
        opacity="0.3"
      />

      {/* Customer 1 (front) */}
      <Circle cx="60" cy="120" r="14" stroke="currentColor" strokeWidth="3" />
      <Path
        d="M40 158c0-12 9-22 20-22s20 10 20 22"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Customer 2 (behind) */}
      <Circle
        cx="105"
        cy="120"
        r="14"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.7"
      />
      <Path
        d="M85 158c0-12 9-22 20-22s20 10 20 22"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Now-serving sign hanging from the top */}
      <Path
        d="M150 20v40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Rect
        x="118"
        y="58"
        width="74"
        height="32"
        rx="6"
        stroke="currentColor"
        strokeWidth="3"
      />
      <Path
        d="M124 71h62M124 80h44"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </StyledSvg>
  );
}
