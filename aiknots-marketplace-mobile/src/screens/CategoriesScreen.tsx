import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import AnimatedPressable from "../components/AnimatedPressable";
import { Skeleton } from "../components/Skeleton";
import { ErrorState } from "../components/UI";
import { api } from "../lib/api";
import { GRID_GAP, SCREEN_PAD, useCardWidth } from "../lib/layout";
import { useAsync } from "../lib/useAsync";
import { colors, radius, shadow } from "../theme";
import type { RootStackParams } from "../types";

export default function CategoriesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const w = useCardWidth();
  const cats = useAsync(() => api.catalog.categories(), []);

  if (cats.error && !cats.data) return <ErrorState message={cats.error} onRetry={cats.reload} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      data={cats.loading ? [] : cats.data ?? []}
      keyExtractor={(c) => c.id}
      numColumns={2}
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={{ padding: SCREEN_PAD, gap: GRID_GAP }}
      refreshing={cats.refreshing}
      onRefresh={cats.refresh}
      ListHeaderComponent={
        cats.loading ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width={w} height={110} r={radius.lg} />
            ))}
          </View>
        ) : null
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(16)} style={{ width: w }}>
          <AnimatedPressable
            onPress={() => nav.navigate("Products", { categoryId: item.id, title: item.name })}
            style={s.tile}
            accessibilityLabel={item.name}
          >
            <View style={s.iconWrap}>
              <Ionicons name={(item.icon as keyof typeof Ionicons.glyphMap) ?? "pricetag-outline"} size={28} color={colors.primary} />
            </View>
            <Text style={s.name}>{item.name}</Text>
          </AnimatedPressable>
        </Animated.View>
      )}
    />
  );
}

const s = StyleSheet.create({
  tile: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, height: 110, justifyContent: "space-between", ...shadow.card },
  iconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
});
