import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { Button } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { initials } from "../lib/format";
import { colors, radius } from "../theme";
import type { RootStackParams } from "../types";

type IconName = keyof typeof Ionicons.glyphMap;

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { items: wishlist } = useWishlist();
  const toast = useToast();

  const menu: { icon: IconName; label: string; sub?: string; onPress: () => void; auth?: boolean }[] = [
    { icon: "receipt-outline", label: "My orders", sub: "Track, return or cancel", onPress: () => nav.navigate("Orders"), auth: true },
    { icon: "heart-outline", label: "Wishlist", sub: `${wishlist.length} saved`, onPress: () => nav.navigate("Wishlist") },
    { icon: "location-outline", label: "Addresses", sub: "Manage delivery addresses", onPress: () => nav.navigate("Addresses"), auth: true },
    { icon: "notifications-outline", label: "Notifications", onPress: () => nav.navigate("Notifications"), auth: true },
    { icon: "sparkles-outline", label: "AI shopping assistant", sub: "Ask about products, orders, offers", onPress: () => nav.navigate("AIChat") },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[colors.primary, colors.pine]} style={[s.head, { paddingTop: insets.top + 24 }]}>
        <Animated.View entering={FadeInDown.duration(400)} style={s.avatar}>
          <Text style={s.avatarText}>{user ? initials(user.fullName) : "?"}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={{ alignItems: "center" }}>
          <Text style={s.name}>{user ? user.fullName : "Guest"}</Text>
          <Text style={s.email}>{user ? user.email : "Sign in to track orders and sync your cart"}</Text>
        </Animated.View>
        {!user && (
          <Animated.View entering={FadeInDown.delay(150)} style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Button title="Sign in" variant="accent" onPress={() => nav.navigate("Login")} style={{ paddingHorizontal: 28 }} />
            <Button title="Create account" variant="ghost" onPress={() => nav.navigate("Register")} style={{ borderColor: "#fff" }} />
          </Animated.View>
        )}
      </LinearGradient>

      <View style={{ padding: 16, gap: 10 }}>
        {menu.map((m, i) => (
          <Animated.View key={m.label} entering={FadeInDown.delay(120 + i * 50).springify().damping(18)}>
            <AnimatedPressable
              onPress={() => (m.auth && !user ? nav.navigate("Login") : m.onPress())}
              scaleTo={0.985}
              style={s.row}
              accessibilityRole="button"
              accessibilityLabel={m.label}
            >
              <View style={s.rowIcon}>
                <Ionicons name={m.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{m.label}</Text>
                {m.sub ? <Text style={s.rowSub}>{m.sub}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </AnimatedPressable>
          </Animated.View>
        ))}

        {user && (
          <Button
            title="Sign out"
            variant="danger"
            icon="log-out-outline"
            style={{ marginTop: 10 }}
            onPress={async () => {
              await signOut();
              toast.show("Signed out", "info");
            }}
          />
        )}
        <Text style={s.version}>AI Knots Marketplace · v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { alignItems: "center", paddingBottom: 30, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 3, borderColor: "rgba(255,255,255,0.5)" },
  avatarText: { fontSize: 30, fontWeight: "800", color: colors.pine },
  name: { color: "#fff", fontSize: 21, fontWeight: "800" },
  email: { color: "rgba(255,255,255,0.82)", fontSize: 13, marginTop: 3, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  version: { textAlign: "center", color: colors.faint, fontSize: 12, marginTop: 14 },
});
