import React from "react";
import { FlatList, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ProductCard from "../components/ProductCard";
import { EmptyState } from "../components/UI";
import { useWishlist } from "../context/WishlistContext";
import { GRID_GAP, SCREEN_PAD, useCardWidth } from "../lib/layout";
import { colors } from "../theme";
import type { RootStackParams } from "../types";

export default function WishlistScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { items } = useWishlist();
  const w = useCardWidth();

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <EmptyState icon="heart-outline" title="Nothing saved yet" message="Tap the heart on any product to keep it here for later." actionLabel="Browse products" onAction={() => nav.navigate("Products")} />
      </View>
    );
  }
  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      data={items}
      numColumns={2}
      keyExtractor={(p) => p.id}
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={{ padding: SCREEN_PAD, gap: GRID_GAP }}
      renderItem={({ item, index }) => <ProductCard product={item} index={index} width={w} />}
    />
  );
}
