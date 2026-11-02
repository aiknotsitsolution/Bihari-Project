import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { colors } from "../theme";

type IconName = keyof typeof Ionicons.glyphMap;

/** Bottom-tab icon: focus par bounce + (optional) badge jo count badalne par pop karta hai. */
export default function TabIcon({
  name,
  activeName,
  focused,
  color,
  size,
  badge = 0,
}: {
  name: IconName;
  activeName: IconName;
  focused: boolean;
  color: string;
  size: number;
  badge?: number;
}) {
  const lift = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    lift.value = withSpring(focused ? -3 : 0, { damping: 9, stiffness: 220 });
  }, [focused, lift]);

  useEffect(() => {
    if (badge > 0) pop.value = withSequence(withSpring(1.5, { damping: 5, stiffness: 400 }), withSpring(1, { damping: 8 }));
  }, [badge, pop]);

  const iconAnim = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const badgeAnim = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View>
      <Animated.View style={iconAnim}>
        <Ionicons name={focused ? activeName : name} size={size} color={color} />
      </Animated.View>
      {badge > 0 && (
        <Animated.View style={[s.badge, badgeAnim]}>
          <Text style={s.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -5,
    right: -10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.alert,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
