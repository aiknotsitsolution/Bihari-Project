import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInRight } from "react-native-reanimated";
import { EmptyState, ErrorState } from "../components/UI";
import { Skeleton } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { timeAgo } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { colors, radius } from "../theme";
import type { RootStackParams } from "../types";

export default function NotificationsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { user } = useAuth();
  const res = useAsync(() => (user ? api.notifications.list() : Promise.resolve([])), [user?._id]);

  if (!user) return <EmptyState icon="notifications-outline" title="Sign in for updates" message="Order and offer updates show up here." actionLabel="Sign in" onAction={() => nav.navigate("Login")} />;
  if (res.error && !res.data) return <ErrorState message={res.error} onRetry={res.reload} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      data={res.data ?? []}
      keyExtractor={(n) => n.id}
      refreshing={res.refreshing}
      onRefresh={res.refresh}
      contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      ListHeaderComponent={res.loading ? <View style={{ gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={70} r={radius.lg} />)}</View> : null}
      ListEmptyComponent={res.loading ? null : <EmptyState icon="notifications-off-outline" title="You're all caught up" message="New updates about your orders and offers will appear here." />}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInRight.delay(Math.min(index, 8) * 60).springify().damping(18)} style={[s.card, !item.read && s.unread]}>
          <View style={s.icon}>
            <Ionicons name={item.title.toLowerCase().includes("order") ? "cube-outline" : "pricetag-outline"} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.body}>{item.body}</Text>
            <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
          </View>
          {!item.read && <View style={s.dot} />}
        </Animated.View>
      )}
    />
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.primary + "55", backgroundColor: "#FAFEFD" },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "800", color: colors.text, fontSize: 14 },
  body: { color: colors.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  time: { color: colors.faint, fontSize: 11, marginTop: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.saffron, marginTop: 4 },
});
