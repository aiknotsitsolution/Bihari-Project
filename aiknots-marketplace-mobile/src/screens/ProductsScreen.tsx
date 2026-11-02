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
import { Button, Chip, EmptyState, ErrorState } from "../components/UI";
import { api, ApiError, KEYS } from "../lib/api";
import { PRICE_RANGES, SORT_OPTIONS } from "../lib/data";
import { GRID_GAP, SCREEN_PAD, useCardWidth } from "../lib/layout";
import { getJson, setJson } from "../lib/storage";
import { colors, radius } from "../theme";
import type { Product, ProductQuery, RootStackParams, SortKey } from "../types";

export default function ProductsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, "Products">>();
  const insets = useSafeAreaInsets();
  const cardW = useCardWidth();
  const params = route.params ?? {};

  const [text, setText] = useState(params.q ?? "");
  const [q, setQ] = useState(params.q ?? "");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [range, setRange] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const reqId = useRef(0);
  const inputRef = useRef<TextInput>(null);

  // debounce search typing
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 380);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    nav.setOptions({ title: params.title ?? "Products" });
    void getJson<string[]>(KEYS.recent, []).then(setRecent);
    if (params.focus) setTimeout(() => inputRef.current?.focus(), 350);
  }, [nav, params.title, params.focus]);

  const query = useCallback(
    (p: number): ProductQuery => ({
      q: q || undefined,
      categoryId: params.categoryId,
      sort,
      minPrice: PRICE_RANGES[range]?.min,
      maxPrice: PRICE_RANGES[range]?.max,
      page: p,
    }),
    [q, params.categoryId, sort, range]
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

  const activeFilters = range !== 0 ? 1 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
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
          ) : null}
        </View>
        <AnimatedPressable onPress={() => setFilterOpen(true)} style={s.filterBtn} accessibilityLabel="Filters" haptic>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          {activeFilters > 0 && <View style={s.dot} />}
        </AnimatedPressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, gap: 8, paddingBottom: 10 }}>
        {SORT_OPTIONS.map((o) => (
          <Chip key={o.key} label={o.label} active={sort === o.key} onPress={() => setSort(o.key)} />
        ))}
      </ScrollView>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ProductGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon="search-outline" title="No products found" message="Try a different keyword or clear the filters." actionLabel={activeFilters ? "Clear filters" : undefined} onAction={() => setRange(0)} />
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
            !q && recent.length > 0 && !params.categoryId ? (
              <Animated.View entering={FadeIn} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                {recent.map((r) => (
                  <Chip key={r} label={r} onPress={() => setText(r)} />
                ))}
              </Animated.View>
            ) : null
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          renderItem={({ item, index }) => <ProductCard product={item} index={index} width={cardW} />}
        />
      )}

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)} statusBarTranslucent>
        <View style={s.backdrop}>
          <AnimatedPressable style={StyleSheet.absoluteFill} onPress={() => setFilterOpen(false)} scaleTo={1}>
            <View style={StyleSheet.absoluteFill} />
          </AnimatedPressable>
          <Animated.View entering={SlideInDown.springify().damping(20)} style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.grab} />
            <Text style={s.sheetTitle}>Filter by price</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 14 }}>
              {PRICE_RANGES.map((r, i) => (
                <Chip key={r.label} label={r.label} active={range === i} onPress={() => setRange(i)} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Reset" variant="ghost" onPress={() => setRange(0)} style={{ flex: 1 }} />
              <Button title="Show results" onPress={() => setFilterOpen(false)} style={{ flex: 2 }} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: "row", gap: 10, padding: SCREEN_PAD, paddingBottom: 10 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  filterBtn: { width: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron },
  backdrop: { flex: 1, backgroundColor: "rgba(15,47,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20 },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
});
