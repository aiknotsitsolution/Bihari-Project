import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  SlideOutLeft,
  useAnimatedStyle,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import AnimatedPressable from "../components/AnimatedPressable";
import QuantityStepper from "../components/QuantityStepper";
import { Button, Divider, EmptyState, Input, Price } from "../components/UI";
import { FREE_SHIPPING_ABOVE, useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../lib/format";
import { colors, radius, shadow } from "../theme";
import type { CartItem, RootStackParams } from "../types";

function DeleteAction({ drag, onPress }: { drag: SharedValue<number>; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(drag.value + 84, { damping: 20 }) }] }));
  return (
    <Animated.View style={[s.deleteWrap, style]}>
      <AnimatedPressable onPress={onPress} style={s.deleteBtn} accessibilityLabel="Remove item" haptic>
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </AnimatedPressable>
    </Animated.View>
  );
}

function Row({ item, index }: { item: CartItem; index: number }) {
  const { setQuantity, remove } = useCart();
  const ref = useRef<SwipeableMethods>(null);
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 50).springify().damping(18)}
      exiting={SlideOutLeft.duration(220)}
      layout={LinearTransition.springify().damping(20)}
      style={{ marginBottom: 10 }}
    >
      <ReanimatedSwipeable
        ref={ref}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={(_p, drag) => <DeleteAction drag={drag} onPress={() => remove(item.id)} />}
      >
        <View style={s.item}>
          <Image source={{ uri: item.product.images[0] }} style={s.img} contentFit="cover" transition={200} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={2} style={s.title}>
              {item.product.title}
            </Text>
            {(item.size || item.color) && <Text style={s.meta}>{[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(" · ")}</Text>}
            <Price price={item.product.price * item.quantity} mrp={item.product.mrp * item.quantity} size={15} />
            <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
              <QuantityStepper value={item.quantity} max={Math.min(item.product.stock, 10)} onChange={(v) => setQuantity(item.id, v)} />
            </View>
          </View>
        </View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

export default function CartScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { items, subtotal, mrpTotal, discount, shipping, total, coupon, applyCoupon, removeCoupon } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const progress = Math.min(subtotal / FREE_SHIPPING_ABOVE, 1);
  const barStyle = useAnimatedStyle(() => ({ width: withTiming(`${progress * 100}%`, { duration: 450 }) }));

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <EmptyState icon="bag-outline" title="Your cart is empty" message="Add something you like and it will show up here." actionLabel="Start shopping" onAction={() => nav.navigate("Tabs", { screen: "Home" } as never)} />
      </View>
    );
  }

  const apply = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await applyCoupon(code);
      toast.show("Coupon applied");
      setCode("");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't apply coupon", "error");
    } finally {
      setBusy(false);
    }
  };

  const checkout = () => (user ? nav.navigate("Checkout") : nav.navigate("Login"));
  const savings = mrpTotal - subtotal + discount;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.ship}>
          <Ionicons name="bicycle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: colors.text, fontSize: 13 }}>
              {subtotal >= FREE_SHIPPING_ABOVE ? "You've unlocked free delivery" : `Add ${formatINR(FREE_SHIPPING_ABOVE - subtotal)} more for free delivery`}
            </Text>
            <View style={s.track}>
              <Animated.View style={[s.fill, barStyle]} />
            </View>
          </View>
        </View>

        {items.map((it, i) => (
          <Row key={it.id} item={it} index={i} />
        ))}

        <Animated.View layout={LinearTransition} style={s.card}>
          <Text style={s.cardTitle}>Coupon</Text>
          {coupon ? (
            <Animated.View entering={FadeInDown} exiting={FadeOut} style={s.applied}>
              <Ionicons name="pricetag" size={18} color={colors.success} />
              <Text style={{ flex: 1, fontWeight: "700", color: colors.success }}>
                {coupon.code} · you save {formatINR(coupon.discount)}
              </Text>
              <AnimatedPressable
                onPress={() => removeCoupon().catch((e) => toast.show(e instanceof Error ? e.message : "Couldn't remove coupon", "error"))}
                hitSlop={8}
              >
                <Text style={{ color: colors.alert, fontWeight: "700" }}>Remove</Text>
              </AnimatedPressable>
            </Animated.View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Enter coupon code" autoCapitalize="characters" icon="pricetag-outline" />
              </View>
              <Button title="Apply" onPress={apply} loading={busy} style={{ paddingHorizontal: 20, minHeight: 50 }} />
            </View>
          )}
        </Animated.View>

        <Animated.View layout={LinearTransition} style={s.card}>
          <Text style={s.cardTitle}>Price details</Text>
          <Line label="Items total" value={formatINR(mrpTotal)} />
          <Line label="Product discount" value={`− ${formatINR(mrpTotal - subtotal)}`} good />
          {discount > 0 && <Line label="Coupon discount" value={`− ${formatINR(discount)}`} good />}
          <Line label="Delivery" value={shipping === 0 ? "Free" : formatINR(shipping)} good={shipping === 0} />
          <Divider style={{ marginVertical: 10 }} />
          <Line label="Total" value={formatINR(total)} bold />
          {savings > 0 && <Text style={s.save}>You're saving {formatINR(savings)} on this order</Text>}
        </Animated.View>
      </ScrollView>

      <View style={s.bottom}>
        <View>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Total</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{formatINR(total)}</Text>
        </View>
        <Button title={user ? "Checkout" : "Sign in to checkout"} onPress={checkout} style={{ flex: 1, marginLeft: 20 }} />
      </View>
    </View>
  );
}

function Line({ label, value, good, bold }: { label: string; value: string; good?: boolean; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: bold ? colors.text : colors.muted, fontWeight: bold ? "800" : "500", fontSize: bold ? 16 : 14 }}>{label}</Text>
      <Text style={{ color: good ? colors.success : colors.text, fontWeight: bold ? "800" : "600", fontSize: bold ? 16 : 14 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  ship: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, marginBottom: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: "#fff", marginTop: 8, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  item: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: radius.lg, padding: 10, borderWidth: 1, borderColor: colors.border },
  img: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: "#E6EEEC" },
  title: { fontSize: 14, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  deleteWrap: { width: 84, justifyContent: "center", alignItems: "flex-end" },
  deleteBtn: { width: 70, height: "100%", backgroundColor: colors.alert, borderTopRightRadius: radius.lg, borderBottomRightRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, marginTop: 6, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 10 },
  applied: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F6EE", padding: 12, borderRadius: radius.md },
  save: { color: colors.success, fontWeight: "700", fontSize: 13, marginTop: 8 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border, ...shadow.float },
});
