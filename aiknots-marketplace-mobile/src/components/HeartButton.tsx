import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { colors } from "../theme";
import AnimatedPressable from "./AnimatedPressable";

/** Wishlist heart: toggle par "pop" animation. */
export default function HeartButton({
  active,
  onPress,
  size = 20,
  floating = true,
}: {
  active: boolean;
  onPress: () => void;
  size?: number;
  floating?: boolean;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      hitSlop={8}
      onPress={() => {
        scale.value = withSequence(withSpring(1.45, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 8 }));
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={active ? "Remove from wishlist" : "Add to wishlist"}
      style={floating ? s.floating : undefined}
    >
      <Animated.View style={anim}>
        <Ionicons name={active ? "heart" : "heart-outline"} size={size} color={active ? colors.alert : colors.muted} />
      </Animated.View>
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  floating: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
