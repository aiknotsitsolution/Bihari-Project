import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow } from "../theme";

type ToastKind = "success" | "error" | "info";
interface Ctx {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<Ctx>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const icon = toast?.kind === "error" ? "alert-circle" : toast?.kind === "info" ? "information-circle" : "checkmark-circle";
  const tint = toast?.kind === "error" ? colors.alert : toast?.kind === "info" ? colors.info : colors.primary;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.springify().damping(16)}
          exiting={FadeOutUp.duration(180)}
          style={[s.toast, { top: insets.top + 8 }]}
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Ionicons name={icon} size={20} color={tint} />
          <Text style={s.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.pine,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    ...shadow.float,
  },
  text: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },
});
