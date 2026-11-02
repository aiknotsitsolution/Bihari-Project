import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { Button, Divider, EmptyState } from "../components/UI";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { api, USE_MOCK } from "../lib/api";
import { formatINR } from "../lib/format";
import { colors, radius } from "../theme";
import type { Address, PaymentMethod, RootStackParams } from "../types";

function Radio({ on }: { on: boolean }) {
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1 : 0, { damping: 12, stiffness: 300 }) }] }));
  return (
    <View style={[s.radio, on && { borderColor: colors.primary }]}>
      <Animated.View style={[s.radioDot, dot]} />
    </View>
  );
}

export default function CheckoutScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const cart = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>();
  const [method, setMethod] = useState<PaymentMethod>("COD");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api.addresses
        .list()
        .then((list) => {
          setAddresses(list);
          setAddressId((cur) => (cur && list.some((a) => a.id === cur) ? cur : (list.find((a) => a.isDefault) ?? list[0])?.id));
        })
        .catch((e) => toast.show(e instanceof Error ? e.message : "Couldn't load addresses", "error"));
    }, [toast])
  );

  if (cart.items.length === 0) {
    return <EmptyState icon="bag-outline" title="Nothing to check out" message="Your cart is empty." actionLabel="Go shopping" onAction={() => nav.popToTop()} />;
  }

  const place = async () => {
    const address = addresses.find((a) => a.id === addressId);
    if (!address) return toast.show("Choose a delivery address", "info");
    setBusy(true);
    try {
      const order = await api.orders.create({
        address,
        paymentMethod: method,
        couponCode: cart.coupon?.code,
        items: cart.items,
        subtotal: cart.subtotal,
        discount: cart.discount,
        shipping: cart.shipping,
      });
      await cart.clear();
      nav.replace("OrderSuccess", { orderNumber: order.orderNumber });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't place the order", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(350)}>
          <View style={s.head}>
            <Text style={s.h}>Delivery address</Text>
            <AnimatedPressable onPress={() => nav.navigate("Addresses")} hitSlop={8}>
              <Text style={s.link}>{addresses.length ? "Manage" : "Add"}</Text>
            </AnimatedPressable>
          </View>
          {addresses.length === 0 ? (
            <AnimatedPressable onPress={() => nav.navigate("Addresses")} style={s.addBox}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Add a delivery address</Text>
            </AnimatedPressable>
          ) : (
            addresses.map((a) => (
              <AnimatedPressable key={a.id} onPress={() => setAddressId(a.id)} scaleTo={0.985} style={[s.option, addressId === a.id && s.optionOn]}>
                <Radio on={addressId === a.id} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: colors.text }}>{a.name}</Text>
                  <Text style={s.sub}>{[a.line1, a.line2].filter(Boolean).join(", ")}, {a.city}, {a.state} {a.pincode}</Text>
                  <Text style={s.sub}>Mobile: {a.mobile}</Text>
                </View>
              </AnimatedPressable>
            ))
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <View style={s.head}>
            <Text style={s.h}>Payment</Text>
          </View>
          {(
            USE_MOCK
              ? [
              { key: "COD", title: "Cash on delivery", sub: "Pay when your order arrives", icon: "cash-outline" },
              { key: "ONLINE", title: "Pay online", sub: "UPI, cards and netbanking via Razorpay / Stripe", icon: "card-outline" },
                ] as const
              : [
                  { key: "COD", title: "Cash on delivery", sub: "Pay when your order arrives", icon: "cash-outline" },
                ] as const
          ).map((m) => (
            <AnimatedPressable key={m.key} onPress={() => setMethod(m.key)} scaleTo={0.985} style={[s.option, method === m.key && s.optionOn]}>
              <Radio on={method === m.key} />
              <Ionicons name={m.icon} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: colors.text }}>{m.title}</Text>
                <Text style={s.sub}>{m.sub}</Text>
              </View>
            </AnimatedPressable>
          ))}
          {!USE_MOCK && <Text style={s.sub}>Online payments are not configured for this backend yet.</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <View style={s.head}>
            <Text style={s.h}>Order summary</Text>
          </View>
          <View style={s.summary}>
            {cart.items.map((it) => (
              <View key={it.id} style={{ flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "center" }}>
                <Image source={{ uri: it.product.images[0] }} style={{ width: 48, height: 48, borderRadius: 8 }} contentFit="cover" />
                <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 13 }}>
                  {it.product.title} × {it.quantity}
                </Text>
                <Text style={{ fontWeight: "700", color: colors.text }}>{formatINR(it.product.price * it.quantity)}</Text>
              </View>
            ))}
            <Divider style={{ marginVertical: 6 }} />
            <Row label="Subtotal" value={formatINR(cart.subtotal)} />
            {cart.discount > 0 && <Row label="Coupon" value={`− ${formatINR(cart.discount)}`} good />}
            <Row label="Delivery" value={cart.shipping === 0 ? "Free" : formatINR(cart.shipping)} good={cart.shipping === 0} />
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[s.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Amount to pay</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{formatINR(cart.total)}</Text>
        </View>
        <Button title={method === "COD" ? "Place order" : "Pay and place order"} onPress={place} loading={busy} style={{ flex: 1, marginLeft: 20 }} />
      </View>
    </View>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ fontWeight: "600", color: good ? colors.success : colors.text }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 },
  h: { fontSize: 17, fontWeight: "800", color: colors.text },
  link: { color: colors.primary, fontWeight: "700" },
  option: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: colors.border },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  sub: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faint, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  addBox: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 18, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary },
  summary: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border },
});
