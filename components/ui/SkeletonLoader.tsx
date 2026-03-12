// ─────────────────────────────────────────────────────────────
// components/ui/SkeletonLoader.tsx
// Animated placeholder for loading states.
// ─────────────────────────────────────────────────────────────
import React from "react";
import { COLOURS } from "@/lib/constants";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

export const Skeleton = React.memo(
  ({ width, height, borderRadius = 8, style }: SkeletonProps) => {
    const progress = useSharedValue(0);

    React.useEffect(() => {
      progress.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    }, []);

    const animStyle = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [COLOURS.surfaceAlt, COLOURS.border],
      ),
    }));

    return (
      <Animated.View
        style={[{ width, height, borderRadius }, animStyle, style]}
      />
    );
  },
);
