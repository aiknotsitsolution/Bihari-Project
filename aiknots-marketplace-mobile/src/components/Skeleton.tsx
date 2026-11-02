import React, { useEffect } from "react";
import { DimensionValue, StyleProp, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "../theme";

/** Shimmer-jaisa pulsing placeholder (loading ke time). */
export function Skeleton({
  width = "100%",
  height = 16,
  r = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  r?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const o = useSharedValue(0.45);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: "#DCE6E3" }, anim, style]} />;
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: "47.8%", backgroundColor: colors.card, borderRadius: radius.lg, padding: 10 }}>
          <Skeleton height={150} r={radius.md} />
          <Skeleton height={13} style={{ marginTop: 10 }} width="85%" />
          <Skeleton height={13} style={{ marginTop: 6 }} width="45%" />
        </View>
      ))}
    </View>
  );
}
