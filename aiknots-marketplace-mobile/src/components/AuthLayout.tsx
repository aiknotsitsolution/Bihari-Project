import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { colors, radius, shadow } from "../theme";

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primary, colors.pine]} style={s.hero}>
          <Animated.View entering={FadeInDown.duration(500)} style={s.logoRow}>
            <View style={s.logo}>
              <Ionicons name="bag-handle" size={24} color={colors.primary} />
            </View>
            <Text style={s.brand}>AI Knots</Text>
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={s.title}>
            {title}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(180).duration(500)} style={s.sub}>
            {subtitle}
          </Animated.Text>
        </LinearGradient>
        <Animated.View entering={FadeInUp.delay(200).springify().damping(18)} style={s.sheet}>
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: { paddingTop: 72, paddingBottom: 56, paddingHorizontal: 24 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 },
  logo: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  brand: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 6 },
  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 22,
    paddingTop: 28,
    ...shadow.card,
  },
});
