import React, { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { Chip } from "../components/UI";
import { api } from "../lib/api";
import { colors, radius } from "../theme";
import type { ChatMessage } from "../types";

const SUGGESTIONS = ["Track my order", "Any coupons today?", "Best earbuds under ₹1,500", "Return policy"];

function Dot({ delay }: { delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-5, { duration: 280 }), withTiming(0, { duration: 280 })), -1));
  }, [delay, y]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[s.typingDot, a]} />;
}

export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m0", role: "assistant", text: "Hi! I'm your shopping assistant. Ask me about products, orders or offers." },
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async (raw: string) => {
    const msg = raw.trim();
    if (!msg || typing) return;
    const mine: ChatMessage = { id: `u${Date.now()}`, role: "user", text: msg };
    const history = [...messages, mine];
    setMessages(history);
    setText("");
    setTyping(true);
    try {
      const reply = await api.ai.chat(msg, messages);
      setMessages((p) => [...p, { id: `a${Date.now()}`, role: "assistant", text: reply }]);
    } catch (e) {
      setMessages((p) => [...p, { id: `e${Date.now()}`, role: "assistant", text: e instanceof Error ? e.message : "Something went wrong. Try again." }]);
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, typing]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListFooterComponent={
          typing ? (
            <Animated.View entering={FadeInDown} style={[s.bubble, s.bot, { flexDirection: "row", gap: 5, paddingVertical: 14 }]}>
              <Dot delay={0} />
              <Dot delay={140} />
              <Dot delay={280} />
            </Animated.View>
          ) : null
        }
        renderItem={({ item }) => (
          <Animated.View entering={FadeInDown.duration(260)} style={[s.bubble, item.role === "user" ? s.me : s.bot]}>
            <Text style={{ color: item.role === "user" ? "#fff" : colors.text, fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
          </Animated.View>
        )}
      />
      {messages.length < 2 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          {SUGGESTIONS.map((q) => (
            <Chip key={q} label={q} onPress={() => send(q)} />
          ))}
        </View>
      )}
      <View style={[s.bar, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask anything"
          placeholderTextColor={colors.faint}
          style={s.input}
          multiline
          onSubmitEditing={() => send(text)}
          returnKeyType="send"
        />
        <AnimatedPressable onPress={() => send(text)} disabled={!text.trim() || typing} style={[s.send, (!text.trim() || typing) && { opacity: 0.4 }]} accessibilityLabel="Send message" haptic>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  me: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bot: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.faint },
  bar: { flexDirection: "row", gap: 10, alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 110, backgroundColor: colors.paper, borderRadius: radius.lg, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
