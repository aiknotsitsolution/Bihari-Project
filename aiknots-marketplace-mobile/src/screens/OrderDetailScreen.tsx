import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, type RouteProp } from "@react-navigation/native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { Button, Divider, ErrorState, Price } from "../components/UI";
import { Skeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { ORDER_STEPS, STATUS_COLOR } from "../lib/data";
import { formatDate, formatINR } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { colors, radius } from "../theme";
import type { Order, RootStackParams } from "../types";

const STEP_H = 58;

function Timeline({ status }: { status: Order["status"] }) {
  const idx = ORDER_STEPS.findIndex((x) => x.status === status);
  const cancelled = status === "CANCELLED" || status === "PAYMENT_FAILED";
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(250, withTiming(Math.max(idx, 0) / (ORDER_STEPS.length - 1), { duration: 900 }));
  }, [idx, p]);
  const fill = useAnimatedStyle(() => ({ height: p.value * STEP_H * (ORDER_STEPS.length - 1) }));

  if (cancelled) {
    return (
      <View style={[s.cancel]}>
        <Ionicons name="close-circle" size={22} color={colors.alert} />
        <Text style={{ color: colors.alert, fontWeight: "700" }}>{status === "CANCELLED" ? "This order was cancelled" : "Payment failed"}</Text>
      </View>
    );
  }
  return (
    <View style={{ height: STEP_H * (ORDER_STEPS.length - 1) + 24, marginTop: 6 }}>
      <View style={s.rail} />
      <Animated.View style={[s.railFill, fill]} />
      {ORDER_STEPS.map((st, i) => {
        const done = i <= idx;
        return (
          <View key={st.status} style={{ position: "absolute", top: i * STEP_H, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={[s.node, done && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {done && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={{ fontWeight: done ? "800" : "500", color: done ? colors.text : colors.faint }}>{st.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useRoute<RouteProp<RootStackParams, "OrderDetail">>().params;
  const toast = useToast();
  const res = useAsync(() => api.orders.get(id), [id]);
  const [cancelling, setCancelling] = useState(false);

  if (res.error && !res.data) return <ErrorState message={res.error} onRetry={res.reload} />;
  const o = res.data;
  if (!o) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton height={120} r={radius.lg} />
        <Skeleton height={200} r={radius.lg} />
      </View>
    );
  }

  const canCancel = o.status === "PLACED" || o.status === "CONFIRMED" || o.status === "PENDING";
  const cancel = async () => {
    setCancelling(true);
    try {
      await api.orders.cancel(o.id);
      toast.show("Order cancelled");
      await res.reload();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't cancel the order", "error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(350)} style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={s.h}>Order #{o.orderNumber}</Text>
            <Text style={s.sub}>Placed on {formatDate(o.createdAt)}</Text>
          </View>
          <Text style={{ color: STATUS_COLOR[o.status], fontWeight: "800", fontSize: 12 }}>{o.status.replace("_", " ")}</Text>
        </View>
        <Divider style={{ marginVertical: 14 }} />
        <Timeline status={o.status} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(350)} style={s.card}>
        <Text style={s.h}>Items</Text>
        {o.items.map((it) => (
          <View key={it.id} style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <Image source={{ uri: it.product.images[0] }} style={{ width: 60, height: 60, borderRadius: radius.md }} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={{ color: colors.text, fontWeight: "600" }}>{it.product.title}</Text>
              <Text style={s.sub}>Qty {it.quantity}{it.size ? ` · Size ${it.size}` : ""}</Text>
              <Price price={it.product.price * it.quantity} size={14} />
            </View>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(350)} style={s.card}>
        <Text style={s.h}>Delivery address</Text>
        <Text style={[s.sub, { marginTop: 6, lineHeight: 20 }]}>
          {o.address.name}{"\n"}{o.address.line1}, {o.address.city}, {o.address.state} {o.address.pincode}{"\n"}Mobile: {o.address.mobile}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(350)} style={s.card}>
        <Text style={s.h}>Payment</Text>
        <Line label="Method" value={o.paymentMethod === "COD" ? "Cash on delivery" : "Paid online"} />
        <Line label="Subtotal" value={formatINR(o.subtotal)} />
        {o.discount > 0 && <Line label="Discount" value={`− ${formatINR(o.discount)}`} />}
        <Line label="Delivery" value={o.shipping ? formatINR(o.shipping) : "Free"} />
        <Divider style={{ marginVertical: 8 }} />
        <Line label="Total" value={formatINR(o.total)} bold />
      </Animated.View>

      {canCancel && <Button title="Cancel order" variant="danger" onPress={cancel} loading={cancelling} />}
    </ScrollView>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
      <Text style={{ color: bold ? colors.text : colors.muted, fontWeight: bold ? "800" : "500" }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: bold ? "800" : "600" }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  h: { fontSize: 16, fontWeight: "800", color: colors.text },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  rail: { position: "absolute", left: 11, top: 12, bottom: 12, width: 2, backgroundColor: colors.border },
  railFill: { position: "absolute", left: 11, top: 12, width: 2, backgroundColor: colors.primary },
  node: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  cancel: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.alertSoft, padding: 12, borderRadius: radius.md },
});
