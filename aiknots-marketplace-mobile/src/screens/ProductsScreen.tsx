import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import ProductCard from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { Button, Chip, EmptyState, ErrorState, SectionHeader } from "../components/UI";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { api, ApiError, KEYS } from "../lib/api";
import { PRICE_RANGES, SORT_OPTIONS } from "../lib/data";
import { GRID_GAP, SCREEN_PAD, useCardWidth } from "../lib/layout";
import { getJson, setJson } from "../lib/storage";
import { colors, radius } from "../theme";
import type { Category, Product, ProductQuery, RootStackParams, SortKey } from "../types";

export default function ProductsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, "Products">>();
  const insets = useSafeAreaInsets();
  const cardW = useCardWidth();
  const { count: cartCount } = useCart();
  const { items: wishlist } = useWishlist();
  const params = route.params ?? {};

  const [text, setText] = useState(params.q ?? "");
  const [q, setQ] = useState(params.q ?? "");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [range, setRange] = useState(0);
  const [draftRange, setDraftRange] = useState(0);
  const [categoryId, setCategoryId] = useState(params.categoryId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const reqId = useRef(0);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // debounce search typing
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 380);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    setText(params.q ?? "");
    setCategoryId(params.categoryId);
  }, [params.q, params.categoryId]);

  useEffect(() => {
    nav.setOptions({
      title: params.title ?? "Products",
      headerRight: () => (
        <View style={s.headerActions}>
          <AnimatedPressable
            onPress={() => nav.navigate("Notifications")}
            style={s.headerIcon}
            accessibilityLabel="Notifications"
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => nav.navigate("Wishlist")}
            style={s.headerIcon}
            accessibilityLabel={`Wishlist${wishlist.length > 0 ? `, ${wishlist.length} items` : ""}`}
            hitSlop={8}
          >
            <Ionicons name="heart-outline" size={21} color={colors.text} />
            {wishlist.length > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{wishlist.length > 99 ? "99+" : wishlist.length}</Text>
              </View>
            )}
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => nav.navigate("Cart")}
            style={s.headerIcon}
            accessibilityLabel={`My Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
            hitSlop={8}
          >
            <Ionicons name="bag-handle-outline" size={21} color={colors.text} />
            {cartCount > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
              </View>
            )}
          </AnimatedPressable>
        </View>
      ),
    });
    void getJson<string[]>(KEYS.recent, []).then(setRecent);
    if (params.focus) setTimeout(() => inputRef.current?.focus(), 350);
  }, [nav, params.title, params.focus, cartCount]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await api.catalog.categories());
      setCategoriesError(false);
    } catch {
      setCategoriesError(true);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const query = useCallback(
    (p: number): ProductQuery => ({
      q: q || undefined,
      categoryId,
      sort,
      minPrice: PRICE_RANGES[range]?.min,
      maxPrice: PRICE_RANGES[range]?.max,
      page: p,
    }),
    [q, categoryId, sort, range]
  );

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.catalog.products(query(0));
      if (id !== reqId.current) return;
      setItems(res.items);
      setPage(0);
      setHasMore(res.hasMore);
    } catch (e) {
      if (id === reqId.current) setError(e instanceof ApiError ? e.message : "Couldn't load products");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await api.catalog.products(query(page + 1));
      setItems((prev) => [...prev, ...res.items.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage(page + 1);
      setHasMore(res.hasMore);
    } catch {
      /* next scroll retries */
    } finally {
      setLoadingMore(false);
    }
  };

  const saveRecent = async (term: string) => {
    if (!term) return;
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
    setRecent(next);
    await setJson(KEYS.recent, next);
  };

  const activeFilters = (range !== 0 ? 1 : 0) + (categoryId ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={s.controls}>
        <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Search products"
            placeholderTextColor={colors.faint}
            returnKeyType="search"
            onSubmitEditing={() => saveRecent(text.trim())}
            style={s.searchInput}
          />
          {text ? (
            <AnimatedPressable onPress={() => setText("")} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.faint} />
            </AnimatedPressable>
          ) : undefined}
        </View>
        <AnimatedPressable onPress={() => setFilterOpen(true)} style={s.filterBtn} accessibilityLabel="Filters" haptic>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          {activeFilters > 0 && (
            <View style={s.filterCount}>
              <Text style={s.filterCountText}>{activeFilters}</Text>
            </View>
          )}
        </AnimatedPressable>
        </View>

        <View style={s.filterSection}>
          <SectionHeader title="Browse categories" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={s.chipRow}
          >
            <Chip label="All products" active={!categoryId} onPress={() => setCategoryId(undefined)} />
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                active={categoryId === category.id}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={s.sortSection}>
          <Ionicons name="swap-vertical-outline" size={16} color={colors.muted} />
          <Text style={s.sortLabel}>Sort</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={s.sortRow}
          >
            {SORT_OPTIONS.map((o) => (
              <Chip key={o.key} label={o.label} active={sort === o.key} onPress={() => setSort(o.key)} />
            ))}
          </ScrollView>
        </View>
      </View>

      {categoriesError && (
        <AnimatedPressable onPress={() => void loadCategories()} style={s.categoryError}>
          <Text style={{ color: colors.alert, fontSize: 12 }}>Categories couldn’t load. Tap to retry.</Text>
        </AnimatedPressable>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ProductGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No products found"
          message="Try a different keyword or clear the filters."
          actionLabel={activeFilters ? "Clear filters" : undefined}
          onAction={() => {
            setRange(0);
            setCategoryId(undefined);
          }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GRID_GAP }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, paddingBottom: 24, gap: GRID_GAP }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <Text style={s.resultCount}>{items.length} products</Text>
              {!q && recent.length > 0 && !categoryId ? (
              <Animated.View entering={FadeIn} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                {recent.map((r) => (
                  <Chip key={r} label={r} onPress={() => setText(r)} />
                ))}
              </Animated.View>
              ) : undefined}
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : undefined
          }
          renderItem={({ item, index }) => <ProductCard product={item} index={index} width={cardW} />}
        />
      )}

      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onShow={() => setDraftRange(range)}
        onRequestClose={() => setFilterOpen(false)}
        statusBarTranslucent
      >
        <View style={s.backdrop}>
          <AnimatedPressable style={StyleSheet.absoluteFill} onPress={() => setFilterOpen(false)} scaleTo={1}>
            <View style={StyleSheet.absoluteFill} />
          </AnimatedPressable>
          <Animated.View entering={SlideInDown.springify().damping(20)} style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.grab} />
            <Text style={s.sheetTitle}>Filter by price</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 14 }}>
              {PRICE_RANGES.map((r, i) => (
                <Chip key={r.label} label={r.label} active={draftRange === i} onPress={() => setDraftRange(i)} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                title="Reset"
                variant="ghost"
                onPress={() => {
                  setDraftRange(0);
                  setRange(0);
                  setCategoryId(undefined);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Show results"
                onPress={() => {
                  setRange(draftRange);
                  setFilterOpen(false);
                }}
                style={{ flex: 2 }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  controls: {
    backgroundColor: colors.paper,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: SCREEN_PAD, paddingBottom: 16 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  filterBtn: { width: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  filterCount: { position: "absolute", top: 5, right: 5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterCountText: { color: colors.pine, fontSize: 10, fontWeight: "800" },
  filterSection: { marginBottom: 12 },
  chipRow: { paddingHorizontal: SCREEN_PAD, gap: 8 },
  sortSection: { flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: SCREEN_PAD, paddingBottom: 8 },
  sortLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  sortRow: { paddingHorizontal: 8, gap: 8 },
  categoryError: { paddingHorizontal: SCREEN_PAD, paddingBottom: 8 },
  resultCount: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 4 },
  headerIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  cartBadge: { position: "absolute", top: 1, right: 0, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: colors.alert, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(15,47,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20 },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
});
