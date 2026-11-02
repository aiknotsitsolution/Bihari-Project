import React from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import BannerCarousel from "../components/BannerCarousel";
import ProductCard from "../components/ProductCard";
import { ProductGridSkeleton, Skeleton } from "../components/Skeleton";
import { ErrorState, SectionHeader } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { api } from "../lib/api";
import { BANNERS } from "../lib/data";
import { GRID_GAP, SCREEN_PAD, useCardWidth } from "../lib/layout";
import { useAsync } from "../lib/useAsync";
import { colors, radius } from "../theme";
import type { Banner, RootStackParams } from "../types";

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { count: cartCount } = useCart();
  const { items: wishlist } = useWishlist();
  const cardW = useCardWidth();
  const home = useAsync(() => api.catalog.home(), []);

  const openBanner = (b: Banner) =>
    nav.navigate("Products", { categoryId: b.categoryId, title: b.title });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={home.refreshing} onRefresh={home.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Animated.View entering={FadeInDown.duration(450)} style={s.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.hello}>{user ? `Hi, ${user.fullName.split(" ")[0]}` : "Welcome to AI Knots"}</Text>
            <Text style={s.helloSub}>What are you shopping for today?</Text>
          </View>
          <AnimatedPressable onPress={() => nav.navigate("Notifications")} style={s.iconBtn} accessibilityLabel="Notifications" haptic>
            <Ionicons name="notifications-outline" size={21} color="#fff" />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => nav.navigate("Cart")}
            style={s.iconBtn}
            accessibilityLabel={`My Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
            haptic
          >
            <Ionicons name="bag-handle-outline" size={21} color="#fff" />
            {cartCount > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
              </View>
            )}
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => nav.navigate("Wishlist")}
            style={s.iconBtn}
            accessibilityLabel={`Wishlist${wishlist.length > 0 ? `, ${wishlist.length} items` : ""}`}
            haptic
          >
            <Ionicons name="heart-outline" size={21} color="#fff" />
            {wishlist.length > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{wishlist.length > 99 ? "99+" : wishlist.length}</Text>
              </View>
            )}
          </AnimatedPressable>
          <AnimatedPressable onPress={() => nav.navigate("AIChat")} style={s.iconBtn} accessibilityLabel="AI assistant" haptic>
            <Ionicons name="sparkles" size={20} color={colors.saffron} />
          </AnimatedPressable>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(90).duration(450)}>
          <AnimatedPressable onPress={() => nav.navigate("Products", { focus: true })} scaleTo={0.985} style={s.search} accessibilityLabel="Search products">
            <Ionicons name="search" size={18} color={colors.muted} />
            <Text style={s.searchText}>Search products, brands and more</Text>
          </AnimatedPressable>
        </Animated.View>
      </LinearGradient>

      <View style={{ marginTop: 16 }}>
        <BannerCarousel banners={BANNERS} onPress={openBanner} />
      </View>

      {home.error && !home.data ? (
        <ErrorState message={home.error} onRetry={home.reload} />
      ) : (
        <>
          <View style={{ marginTop: 22 }}>
            <SectionHeader title="Shop by category" action="See all" onAction={() => nav.navigate("Tabs", { screen: "Categories" } as never)} />
            {home.loading ? (
              <View style={{ flexDirection: "row", gap: 14, paddingHorizontal: SCREEN_PAD }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} width={64} height={64} r={32} />
                ))}
              </View>
            ) : (
              <FlatList
                horizontal
                data={home.data?.categories ?? []}
                keyExtractor={(c) => c.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, gap: 14 }}
                renderItem={({ item, index }) => (
                  <Animated.View entering={FadeIn.delay(index * 50)}>
                    <AnimatedPressable
                      onPress={() => nav.navigate("Products", { categoryId: item.id, title: item.name })}
                      style={s.cat}
                      accessibilityLabel={item.name}
                    >
                      <View style={s.catIcon}>
                        <Ionicons name={(item.icon as keyof typeof Ionicons.glyphMap) ?? "pricetag-outline"} size={26} color={colors.primary} />
                      </View>
                      <Text numberOfLines={1} style={s.catName}>
                        {item.name}
                      </Text>
                    </AnimatedPressable>
                  </Animated.View>
                )}
              />
            )}
          </View>

          {(home.loading || (home.data?.deals.length ?? 0) > 0) && (
            <View style={{ marginTop: 24 }}>
              <SectionHeader title="Deals of the day" />
              {home.loading ? (
                <ProductGridSkeleton count={2} />
              ) : (
                <FlatList
                  horizontal
                  data={home.data?.deals ?? []}
                  keyExtractor={(p) => p.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, gap: GRID_GAP, paddingBottom: 6 }}
                  renderItem={({ item, index }) => <ProductCard product={item} index={index} width={Math.min(cardW, 176)} />}
                />
              )}
            </View>
          )}

          <View style={{ marginTop: 24 }}>
            <SectionHeader title="Trending now" action="View all" onAction={() => nav.navigate("Products", { title: "Trending" })} />
            {home.loading ? (
              <ProductGridSkeleton />
            ) : (
              <View style={s.grid}>
                {(home.data?.trending ?? []).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} width={cardW} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: SCREEN_PAD, paddingBottom: 18, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  hello: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  helloSub: { color: "rgba(255,255,255,0.82)", fontSize: 13, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  cartBadge: { position: "absolute", top: -2, right: -2, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: colors.pine, fontSize: 9, fontWeight: "800" },
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13 },
  searchText: { color: colors.faint, fontSize: 14 },
  cat: { alignItems: "center", width: 74, gap: 7 },
  catIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  catName: { fontSize: 12, fontWeight: "600", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP, paddingHorizontal: SCREEN_PAD },
});
