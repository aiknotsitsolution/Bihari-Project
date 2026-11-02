import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Button } from "../components/UI";
import { colors } from "../theme";
import type { RootStackParams } from "../types";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function OrderSuccessScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { orderNumber } = useRoute<RouteProp<RootStackParams, "OrderSuccess">>().params;

  const pop = useSharedValue(0);
  const tick = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 140 });
    tick.value = withDelay(280, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    ring.value = withDelay(500, withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 0 })));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pop, tick, ring]);

  const badge = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: 100 * (1 - tick.value) }));
  const ringProps = useAnimatedProps(() => ({ r: 46 + ring.value * 26, opacity: 0.35 * (1 - ring.value) }));

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.badge, badge]}>
        <Svg width={120} height={120} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
          <AnimatedCircle cx={60} cy={60} fill="none" stroke={colors.primary} strokeWidth={3} animatedProps={ringProps} />
          <AnimatedPath d="M38 62 L54 78 L84 44" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={100} animatedProps={tickProps} />
        </Svg>
      </Animated.View>
      <Animated.Text entering={FadeInUp.delay(500).springify()} style={s.title}>
        Order placed
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(600).springify()} style={s.sub}>
        Thanks for shopping with us. Your order number is
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(680).springify()} style={s.num}>
        {orderNumber}
      </Animated.Text>
      <Animated.View entering={FadeInUp.delay(800).springify()} style={{ alignSelf: "stretch", gap: 10, marginTop: 30 }}>
        <Button title="View my orders" onPress={() => nav.replace("Orders")} />
        <Button title="Continue shopping" variant="ghost" onPress={() => nav.popToTop()} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", padding: 28 },
  badge: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary, marginBottom: 26 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: colors.muted, marginTop: 8, textAlign: "center" },
  num: { fontSize: 20, fontWeight: "800", color: colors.primary, marginTop: 6, letterSpacing: 1 },
});
