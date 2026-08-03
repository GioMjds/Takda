import { styled } from "nativewind";
import Svg, { type SvgProps } from "react-native-svg";

// NativeWind 5 styled wrapper: forwards `className` -> host `style`
// and exposes `color`/`opacity` as native style props.
export const StyledSvg = styled(Svg, {
  className: {
    target: "style",
    nativeStyleMapping: {
      color: true,
      opacity: true,
    },
  },
});

// SvgProps already includes `color`, `style`, and every SVG attribute.
// We add only the illustration-specific knob (`size`).
export type IllustrationProps = SvgProps & {
  size?: number;
  className?: string;
};
