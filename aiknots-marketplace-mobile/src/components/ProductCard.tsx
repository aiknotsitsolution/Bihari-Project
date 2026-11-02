import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useWishlist } from "../context/WishlistContext";
import type { Product, RootStackParams } from "../types";
import { colors, radius, shadow } from "../theme";
import AnimatedPressable from "./AnimatedPressable";
import HeartButton from "./HeartButton";
import { Price, Rating } from "./UI";

export default function ProductCard({
  product,
  index = 0,
  width,
}: {
  product: Product;
  index?: number;
  width?: number;
}) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { has, toggle } = useWishlist();
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 55).springify().damping(18)} style={width ? { width } : undefined}>
      <AnimatedPressable
        onPress={() => nav.navigate("ProductDetail", { id: product.id })}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={product.title}
        style={s.card}
      >
        <View>
          <Image source={{ uri: product.images[0] }} style={s.image} contentFit="cover" transition={250} />
          <HeartButton active={has(product.id)} onPress={() => toggle(product)} />
          {product.discountPercent > 0 && (
            <View style={s.tag}>
              <Text style={s.tagText}>{product.discountPercent}% OFF</Text>
            </View>
          )}
        </View>
        <View style={{ padding: 10, gap: 4 }}>
          {product.brand ? (
            <Text numberOfLines={1} style={s.brand}>
              {product.brand}
            </Text>
          ) : null}
          <Text numberOfLines={2} style={s.title}>
            {product.title}
          </Text>
          <Price price={product.price} mrp={product.mrp} size={15} />
          {product.rating > 0 ? <Rating value={product.rating} count={product.reviewCount} small /> : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden", ...shadow.card },
  image: { width: "100%", aspectRatio: 1, backgroundColor: "#E6EEEC" },
  tag: { position: "absolute", left: 8, bottom: 8, backgroundColor: colors.saffron, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: "800", color: colors.pine },
  brand: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  title: { fontSize: 13, color: colors.text, fontWeight: "600", minHeight: 34 },
});
