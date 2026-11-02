import React, { useState } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import HeartButton from "../components/HeartButton";
import ProductCard from "../components/ProductCard";
import { Skeleton } from "../components/Skeleton";
import { Badge, Button, Chip, Divider, ErrorState, Price, Rating } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { GRID_GAP, SCREEN_PAD, useCardWidth } from "../lib/layout";
import { useAsync } from "../lib/useAsync";
import { colors, radius, shadow } from "../theme";
import type { RootStackParams } from "../types";

const HERO_H = 380;

export default function ProductDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { id } = useRoute<RouteProp<RootStackParams, "ProductDetail">>().params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = useCardWidth();
  const { add, count } = useCart();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const toast = useToast();

  const product = useAsync(() => api.catalog.product(id), [id]);
  const reviews = useAsync(() => api.catalog.reviews(id), [id]);
  const similar = useAsync(async () => {
    const p = await api.catalog.product(id);
    const r = await api.catalog.products({ categoryId: p.categoryId, limit: 8 });
    return r.items.filter((x) => x.id !== id).slice(0, 6);
  }, [id]);

  const [size, setSize] = useState<string>();
  const [color, setColor] = useState<string>();
  const [slide, setSlide] = useState(0);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  // hero: neeche kheenchne par zoom, upar scroll par parallax
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(y.value, [-HERO_H, 0, HERO_H], [-HERO_H / 2, 0, HERO_H * 0.4], Extrapolation.CLAMP) },
      { scale: interpolate(y.value, [-HERO_H, 0], [2, 1], Extrapolation.CLAMP) },
    ],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [HERO_H - 140, HERO_H - 70], [0, 1], Extrapolation.CLAMP),
  }));

  if (product.error && !product.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top + 60 }}>
        <ErrorState message={product.error} onRetry={product.reload} />
      </View>
    );
  }

  const p = product.data;
  const needSize = !!p && p.sizes.length > 0 && !size;
  const needColor = !!p && p.colors.length > 0 && !color;

  const addToCart = async (buyNow = false) => {
    if (!p) return;
    if (needSize || needColor) {
      toast.show(needSize ? "Select a size first" : "Select a colour first", "info");
      return;
    }
    setBusy(true);
    try {
      await add(p, { size, color });
      if (buyNow) {
        if (!user) nav.navigate("Login");
        else nav.navigate("Checkout");
      } else {
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't add to cart", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ height: HERO_H, overflow: "hidden", backgroundColor: "#E6EEEC" }}>
          {p ? (
            <Animated.View style={[{ height: HERO_H }, heroStyle]}>
              <FlatList
                data={p.images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(u, i) => u + i}
                onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / width))}
                renderItem={({ item }) => <Image source={{ uri: item }} style={{ width, height: HERO_H }} contentFit="cover" transition={250} />}
              />
            </Animated.View>
          ) : (
            <Skeleton height={HERO_H} r={0} />
          )}
          {p && p.images.length > 1 && (
            <View style={s.dots}>
              {p.images.map((_, i) => (
                <View key={i} style={[s.dot, i === slide && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={s.sheet}>
          {!p ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={14} width="30%" />
              <Skeleton height={22} width="90%" />
              <Skeleton height={22} width="50%" />
            </View>
          ) : (
            <Animated.View entering={FadeInDown.duration(380)}>
              {p.brand ? <Text style={s.brand}>{p.brand}</Text> : null}
              <Text style={s.title}>{p.title}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                {p.rating > 0 && <Rating value={p.rating} count={p.reviewCount} />}
                {p.stock <= 5 && <Badge text={`Only ${p.stock} left`} tone="alert" />}
              </View>
              <View style={{ marginTop: 14 }}>
                <Price price={p.price} mrp={p.mrp} discount={p.discountPercent} size={26} />
                <Text style={s.tax}>Inclusive of all taxes</Text>
              </View>

              {p.colors.length > 0 && (
                <View style={s.block}>
                  <Text style={s.blockTitle}>Colour{color ? `: ${color}` : ""}</Text>
                  <View style={s.row}>
                    {p.colors.map((c) => (
                      <Chip key={c} label={c} active={color === c} onPress={() => setColor(c)} />
                    ))}
                  </View>
                </View>
              )}
              {p.sizes.length > 0 && (
                <View style={s.block}>
                  <Text style={s.blockTitle}>Size</Text>
                  <View style={s.row}>
                    {p.sizes.map((z) => (
                      <Chip key={z} label={z} active={size === z} onPress={() => setSize(z)} style={{ minWidth: 52, alignItems: "center" }} />
                    ))}
                  </View>
                </View>
              )}

              <Divider style={{ marginVertical: 18 }} />
              <Text style={s.blockTitle}>About this item</Text>
              <Text style={s.desc}>{p.description}</Text>
              {p.highlights.map((h) => (
                <View key={h} style={s.hl}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 14 }}>{h}</Text>
                </View>
              ))}
              {p.sellerName ? <Text style={s.seller}>Sold by {p.sellerName}</Text> : null}

              <Divider style={{ marginVertical: 18 }} />
              <Text style={s.blockTitle}>Customer reviews</Text>
              {reviews.loading ? (
                <Skeleton height={60} />
              ) : (reviews.data ?? []).length === 0 ? (
                <Text style={{ color: colors.muted }}>No reviews yet.</Text>
              ) : (
                (reviews.data ?? []).map((r) => (
                  <Animated.View entering={FadeIn} key={r.id} style={s.review}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontWeight: "700", color: colors.text }}>{r.userName}</Text>
                      <Rating value={r.rating} small />
                    </View>
                    <Text style={{ color: colors.text, marginTop: 6, lineHeight: 20 }}>{r.comment}</Text>
                    <Text style={{ color: colors.faint, fontSize: 12, marginTop: 6 }}>{formatDate(r.createdAt)}</Text>
                  </Animated.View>
                ))
              )}
            </Animated.View>
          )}
        </View>

        {(similar.data ?? []).length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={[s.blockTitle, { paddingHorizontal: SCREEN_PAD }]}>You might also like</Text>
            <FlatList
              horizontal
              data={similar.data ?? []}
              keyExtractor={(x) => x.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, gap: GRID_GAP }}
              renderItem={({ item, index }) => <ProductCard product={item} index={index} width={Math.min(cardW, 176)} />}
            />
          </View>
        )}
      </Animated.ScrollView>

      {/* overlay top bar */}
      <Animated.View pointerEvents="none" style={[s.solidBar, { height: insets.top + 56 }, barStyle]}>
        <Text numberOfLines={1} style={s.barTitle}>
          {p?.title}
        </Text>
      </Animated.View>
      <View style={[s.topRow, { top: insets.top + 8 }]} pointerEvents="box-none">
        <AnimatedPressable onPress={() => nav.goBack()} style={s.roundBtn} accessibilityLabel="Go back" haptic>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </AnimatedPressable>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {p && (
            <View style={s.roundBtn}>
              <HeartButton active={has(p.id)} onPress={() => toggle(p)} floating={false} />
            </View>
          )}
          <AnimatedPressable onPress={() => nav.navigate("Tabs", { screen: "Cart" } as never)} style={s.roundBtn} accessibilityLabel="Open cart">
            <Ionicons name="bag-outline" size={20} color={colors.text} />
            {count > 0 && (
              <View style={s.cartBadge}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{count}</Text>
              </View>
            )}
          </AnimatedPressable>
        </View>
      </View>

      <View style={[s.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title={added ? "Added to cart" : "Add to cart"}
          icon={added ? "checkmark-circle" : "bag-add-outline"}
          variant={added ? "primary" : "ghost"}
          onPress={() => addToCart(false)}
          loading={busy}
          disabled={!p || p.stock < 1}
          style={{ flex: 1 }}
        />
        <Button title="Buy now" variant="accent" onPress={() => addToCart(true)} disabled={!p || p.stock < 1} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dots: { position: "absolute", bottom: 38, alignSelf: "center", flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.6)" },
  dotActive: { width: 20, backgroundColor: "#fff" },
  sheet: { marginTop: -26, backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, minHeight: 200 },
  brand: { color: colors.primary, fontWeight: "800", fontSize: 13, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.4, lineHeight: 28 },
  tax: { color: colors.faint, fontSize: 12, marginTop: 2 },
  block: { marginTop: 18 },
  blockTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  desc: { color: colors.muted, fontSize: 14, lineHeight: 22, marginBottom: 10 },
  hl: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 6 },
  seller: { color: colors.muted, fontSize: 13, marginTop: 14 },
  review: { backgroundColor: "#fff", borderRadius: radius.md, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  topRow: { position: "absolute", left: 14, right: 14, flexDirection: "row", justifyContent: "space-between" },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center", ...shadow.card },
  solidBar: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "#fff", justifyContent: "flex-end", paddingBottom: 14, paddingHorizontal: 72, borderBottomWidth: 1, borderBottomColor: colors.border },
  barTitle: { fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "center" },
  cartBadge: { position: "absolute", top: -2, right: -2, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.alert, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border },
});
