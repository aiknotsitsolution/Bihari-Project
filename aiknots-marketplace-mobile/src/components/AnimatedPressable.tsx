import React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "children" | "style"> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** press par kitna chhota ho (default 0.96) */
  scaleTo?: number;
  haptic?: boolean;
};

/** Press par spring-scale hone wala Pressable (poore app me buttons/cards ke liye). */
export default function AnimatedPressable({
  children,
  style,
  scaleTo = 0.96,
  haptic,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      {...rest}
      style={[style, anim]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 260 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
    >
      {children}
    </APressable>
  );
}
