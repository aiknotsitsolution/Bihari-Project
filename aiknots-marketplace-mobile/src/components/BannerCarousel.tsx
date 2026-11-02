import React, { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import type { Banner } from "../types";
import { colors, radius } from "../theme";
import AnimatedPressable from "./AnimatedPressable";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Banner>);

function Slide({ item, index, x, w, onPress }: { item: Banner; index: number; x: SharedValue<number>; w: number; onPress: () => void }) {
  // image scroll ke saath parallax me khisakti hai
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [(index - 1) * w, index * w, (index + 1) * w], [-w * 0.18, 0, w * 0.18], Extrapolation.CLAMP) }],
  }));
  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.985} style={{ width: w, paddingHorizontal: 16 }}>
      <View style={s.slide}>
        <Animated.View style={[StyleSheet.absoluteFill, { left: -w * 0.2, right: -w * 0.2 }, imgStyle]}>
          <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
        <LinearGradient colors={[item.colors[1] + "F0", item.colors[0] + "99", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={s.copy}>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.sub}>{item.subtitle}</Text>
          <View style={s.cta}>
            <Text style={s.ctaText}>Shop now</Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function Dot({ i, x, w }: { i: number; x: SharedValue<number>; w: number }) {
  const a = useAnimatedStyle(() => ({
    width: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [6, 20, 6], Extrapolation.CLAMP),
    opacity: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [0.35, 1, 0.35], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[s.dot, a]} />;
}

export default function BannerCarousel({ banners, onPress }: { banners: Banner[]; onPress: (b: Banner) => void }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const ref = useRef<FlatList<Banner>>(null);
  const [index, setIndex] = useState(0);
  const touching = useRef(false);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => {
      if (touching.current) return;
      const next = (index + 1) % banners.length;
      ref.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }, 4200);
    return () => clearInterval(t);
  }, [index, banners.length]);

  return (
    <View>
      <AnimatedFlatList
        ref={ref}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(b) => b.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => (touching.current = true)}
        onMomentumScrollEnd={(e) => {
          touching.current = false;
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => <Slide item={item} index={i} x={x} w={width} onPress={() => onPress(item)} />}
      />
      <View style={s.dots}>
        {banners.map((b, i) => (
          <Dot key={b.id} i={i} x={x} w={width} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  slide: { height: 168, borderRadius: radius.xl, overflow: "hidden", backgroundColor: colors.pine, justifyContent: "center" },
  copy: { paddingHorizontal: 20, maxWidth: "72%", gap: 6 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  sub: { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 18 },
  cta: { backgroundColor: "#fff", alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, marginTop: 6 },
  ctaText: { color: colors.pine, fontWeight: "800", fontSize: 12 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
});
