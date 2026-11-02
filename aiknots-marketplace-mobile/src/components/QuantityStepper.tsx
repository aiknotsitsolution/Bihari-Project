import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { colors, radius } from "../theme";
import AnimatedPressable from "./AnimatedPressable";

export default function QuantityStepper({
  value,
  onChange,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <View style={s.wrap}>
      <AnimatedPressable
        onPress={() => onChange(value - 1)}
        disabled={value <= 1}
        haptic
        hitSlop={6}
        accessibilityLabel="Decrease quantity"
        style={[s.btn, value <= 1 && { opacity: 0.4 }]}
      >
        <Ionicons name="remove" size={16} color={colors.text} />
      </AnimatedPressable>
      <View style={s.valueBox}>
        <Animated.Text key={value} entering={FadeInUp.duration(160)} exiting={FadeOutDown.duration(100)} style={s.value}>
          {value}
        </Animated.Text>
      </View>
      <AnimatedPressable
        onPress={() => onChange(value + 1)}
        disabled={value >= max}
        haptic
        hitSlop={6}
        accessibilityLabel="Increase quantity"
        style={[s.btn, value >= max && { opacity: 0.4 }]}
      >
        <Ionicons name="add" size={16} color={colors.text} />
      </AnimatedPressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.card },
  btn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  valueBox: { minWidth: 28, height: 32, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  value: { fontSize: 14, fontWeight: "700", color: colors.text },
});
