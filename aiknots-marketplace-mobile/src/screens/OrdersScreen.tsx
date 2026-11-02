import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import AnimatedPressable from "../components/AnimatedPressable";
import { Skeleton } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/UI";
import { api } from "../lib/api";
import { STATUS_COLOR } from "../lib/data";
import { formatDate, formatINR } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../context/AuthContext";
import { colors, radius } from "../theme";
import type { RootStackParams } from "../types";

export default function OrdersScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { user } = useAuth();
  const orders = useAsync(() => (user ? api.orders.list() : Promise.resolve([])), [user?._id]);

  if (!user) return <EmptyState icon="receipt-outline" title="Sign in to see your orders" message="Your order history shows up here." actionLabel="Sign in" onAction={() => nav.navigate("Login")} />;
  if (orders.error && !orders.data) return <ErrorState message={orders.error} onRetry={orders.reload} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      data={orders.data ?? []}
      keyExtractor={(o) => o.id}
      refreshing={orders.refreshing}
      onRefresh={orders.refresh}
      contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
      ListHeaderComponent={orders.loading ? <View style={{ gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={96} r={radius.lg} />)}</View> : null}
      ListEmptyComponent={orders.loading ? null : <EmptyState icon="receipt-outline" title="No orders yet" message="When you place an order it will appear here." actionLabel="Start shopping" onAction={() => nav.popToTop()} />}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 55).springify().damping(18)}>
          <AnimatedPressable onPress={() => nav.navigate("OrderDetail", { id: item.id })} scaleTo={0.98} style={s.card}>
            <Image source={{ uri: item.items[0]?.product.images[0] }} style={s.img} contentFit="cover" />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.num}>#{item.orderNumber}</Text>
              <Text numberOfLines={1} style={s.items}>
                {item.items[0]?.product.title}
                {item.items.length > 1 ? ` +${item.items.length - 1} more` : ""}
              </Text>
              <Text style={s.date}>{formatDate(item.createdAt)} · {formatINR(item.total)}</Text>
            </View>
            <View style={[s.status, { backgroundColor: STATUS_COLOR[item.status] + "22" }]}>
              <Text style={[s.statusText, { color: STATUS_COLOR[item.status] }]}>{item.status.replace("_", " ")}</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      )}
    />
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border },
  img: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: "#E6EEEC" },
  num: { fontWeight: "800", color: colors.text, fontSize: 14 },
  items: { color: colors.text, fontSize: 13 },
  date: { color: colors.muted, fontSize: 12 },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontWeight: "800" },
});
