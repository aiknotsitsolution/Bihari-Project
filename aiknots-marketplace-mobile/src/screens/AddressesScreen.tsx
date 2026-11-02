import React, { useCallback, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInDown, LinearTransition, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "../components/AnimatedPressable";
import { Badge, Button, Chip, EmptyState, Input } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { INDIAN_STATES } from "../lib/data";
import { colors, radius } from "../theme";
import type { Address } from "../types";

type Draft = Omit<Address, "id">;
const EMPTY: Draft = { name: "", mobile: "", pincode: "", line1: "", line2: "", city: "", state: "Madhya Pradesh", isDefault: false };

export default function AddressesScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await api.addresses.list());
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't load addresses", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const set = (k: keyof Draft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    const e: Record<string, string> = {};
    if (draft.name.trim().length < 2) e.name = "Enter the receiver's name";
    if (!/^\d{10}$/.test(draft.mobile)) e.mobile = "Enter a 10-digit mobile number";
    if (!/^\d{6}$/.test(draft.pincode)) e.pincode = "Enter a 6-digit pincode";
    if (draft.line1.trim().length < 4) e.line1 = "Enter house / street";
    if (!draft.city.trim()) e.city = "Enter your city";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await api.addresses.create({ ...draft, isDefault: list.length === 0 || draft.isDefault });
      setOpen(false);
      setDraft(EMPTY);
      toast.show("Address saved");
      await load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't save address", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setList((p) => p.filter((a) => a.id !== id));
    try {
      await api.addresses.remove(id);
    } catch {
      toast.show("Couldn't delete address", "error");
      void load();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 110, flexGrow: 1 }}
        ListEmptyComponent={loading ? null : <EmptyState icon="location-outline" title="No saved addresses" message="Add a delivery address to check out faster." />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50)} layout={LinearTransition} style={s.card}>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Text style={s.name}>{item.name}</Text>
                {item.isDefault && <Badge text="Default" />}
              </View>
              <Text style={s.line}>{[item.line1, item.line2].filter(Boolean).join(", ")}</Text>
              <Text style={s.line}>{item.city}, {item.state} {item.pincode}</Text>
              <Text style={s.line}>Mobile: {item.mobile}</Text>
            </View>
            <AnimatedPressable onPress={() => remove(item.id)} hitSlop={10} accessibilityLabel="Delete address">
              <Ionicons name="trash-outline" size={20} color={colors.alert} />
            </AnimatedPressable>
          </Animated.View>
        )}
      />
      <View style={[s.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Button title="Add new address" icon="add" onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View entering={SlideInDown.springify().damping(20)} style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>New address</Text>
              <AnimatedPressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.muted} />
              </AnimatedPressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Full name" value={draft.name} onChangeText={set("name")} error={errors.name} />
              <Input label="Mobile number" value={draft.mobile} onChangeText={set("mobile")} keyboardType="number-pad" maxLength={10} error={errors.mobile} />
              <Input label="Pincode" value={draft.pincode} onChangeText={set("pincode")} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
              <Input label="House no., street" value={draft.line1} onChangeText={set("line1")} error={errors.line1} />
              <Input label="Area / landmark (optional)" value={draft.line2} onChangeText={set("line2")} />
              <Input label="City" value={draft.city} onChangeText={set("city")} error={errors.city} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>State</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {INDIAN_STATES.map((st) => (
                  <Chip key={st} label={st} active={draft.state === st} onPress={() => set("state")(st)} />
                ))}
              </View>
              <Button title="Save address" onPress={save} loading={saving} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", gap: 10, backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  name: { fontSize: 15, fontWeight: "800", color: colors.text },
  line: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border },
  backdrop: { flex: 1, backgroundColor: "rgba(15,47,42,0.45)", justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20 },
});
