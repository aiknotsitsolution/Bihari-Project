import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, radius, shadow } from "../theme";
import { formatINR } from "../lib/format";
import AnimatedPressable from "./AnimatedPressable";

type IconName = keyof typeof Ionicons.glyphMap;

export const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[s.card, style]}>{children}</View>
);

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "accent" | "danger";
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const textColor =
    variant === "ghost" ? colors.primary : variant === "danger" ? colors.alert : variant === "accent" ? colors.pine : "#fff";
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={loading || disabled}
      haptic
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        s.btn,
        variant === "ghost" && s.ghost,
        variant === "accent" && { backgroundColor: colors.saffron },
        variant === "danger" && { backgroundColor: colors.alertSoft },
        (loading || disabled) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={s.btnRow}>
          {icon && <Ionicons name={icon} size={18} color={textColor} />}
          <Text style={[s.btnText, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

type InputProps = TextInputProps & { label?: string; error?: string; icon?: IconName };

/** Focus par border colour animate hota hai. */
export function Input({ label, error, icon, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const progress = useDerivedValue(() => withTiming(focused ? 1 : 0, { duration: 160 }));
  const wrap = useAnimatedStyle(() => ({
    borderColor: error ? colors.alert : interpolateColor(progress.value, [0, 1], [colors.border, colors.primary]),
  }));
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <Animated.View style={[s.inputWrap, wrap]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.faint} />}
        <TextInput
          placeholderTextColor={colors.faint}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[s.input, style]}
        />
      </Animated.View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.93}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[s.chip, active && s.chipActive, style]}
    >
      <Text style={[s.chipText, active && { color: "#fff" }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function Badge({ text, tone = "primary" }: { text: string; tone?: "primary" | "saffron" | "alert" }) {
  const bg = tone === "saffron" ? colors.saffronSoft : tone === "alert" ? colors.alertSoft : colors.primarySoft;
  const fg = tone === "saffron" ? "#8A5A00" : tone === "alert" ? colors.alert : colors.primaryDark;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action ? (
        <AnimatedPressable onPress={onAction} scaleTo={0.92} hitSlop={10}>
          <Text style={s.sectionAction}>{action}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyMsg}>{message}</Text>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: 18, alignSelf: "stretch" }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EmptyState icon="cloud-offline-outline" title="Couldn't load this" message={message} actionLabel="Try again" onAction={onRetry} />;
}

export function Price({
  price,
  mrp,
  discount,
  size = 16,
}: {
  price: number;
  mrp?: number;
  discount?: number;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
      <Text style={{ fontSize: size, fontWeight: "800", color: colors.text }}>{formatINR(price)}</Text>
      {mrp && mrp > price ? (
        <Text style={{ fontSize: size * 0.75, color: colors.faint, textDecorationLine: "line-through" }}>{formatINR(mrp)}</Text>
      ) : null}
      {discount ? <Text style={{ fontSize: size * 0.75, color: colors.success, fontWeight: "700" }}>{discount}% off</Text> : null}
    </View>
  );
}

export function Rating({ value, count, small }: { value: number; count?: number; small?: boolean }) {
  const tone = value >= 4 ? colors.success : value >= 3 ? colors.saffron : colors.alert;
  return (
    <View style={[s.rating, { backgroundColor: tone }, small && { paddingVertical: 1 }]}>
      <Text style={[s.ratingText, small && { fontSize: 11 }]}>{value.toFixed(1)}</Text>
      <Ionicons name="star" size={small ? 9 : 11} color="#fff" />
      {count !== undefined ? <Text style={[s.ratingText, { opacity: 0.85, fontWeight: "500" }]}> ({count})</Text> : null}
    </View>
  );
}

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;

export const H1 = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[{ fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.4 }, style]}>{children}</Text>
);

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  ghost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { fontSize: 15, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },
  error: { color: colors.alert, fontSize: 12, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
  sectionAction: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", padding: 32, paddingTop: 64 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 6 },
  emptyMsg: { fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  ratingText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});

export { shadow };
