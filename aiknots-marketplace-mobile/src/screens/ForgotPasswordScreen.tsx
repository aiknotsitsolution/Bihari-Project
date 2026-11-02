import React, { useState } from "react";
import { Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import AuthLayout from "../components/AuthLayout";
import { Button, Input } from "../components/UI";
import { api, USE_MOCK } from "../lib/api";
import { isEmail } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { colors } from "../theme";

export default function ForgotPasswordScreen() {
  const nav = useNavigation();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!isEmail(email)) return setError("Enter a valid email address");
    setError(undefined);
    setBusy(true);
    try {
      await api.auth.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't send the reset email", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle={USE_MOCK ? "We'll email you a code to set a new one" : "Password reset is not available on this backend yet"}>
      {!USE_MOCK ? (
        <Animated.View entering={FadeIn} style={{ alignItems: "center", gap: 12 }}>
          <Text style={{ textAlign: "center", color: colors.muted, fontSize: 14, lineHeight: 21 }}>
            The connected backend does not currently provide password reset.
          </Text>
          <Button title="Back to sign in" onPress={() => nav.goBack()} style={{ alignSelf: "stretch", marginTop: 8 }} />
        </Animated.View>
      ) : sent ? (
        <Animated.View entering={FadeIn} style={{ alignItems: "center", gap: 12 }}>
          <Ionicons name="mail-open-outline" size={44} color={colors.primary} />
          <Text style={{ textAlign: "center", color: colors.text, fontSize: 15, lineHeight: 22 }}>
            If {email} has an account, a reset code is on its way.
          </Text>
          <Button title="Back to sign in" onPress={() => nav.goBack()} style={{ alignSelf: "stretch", marginTop: 8 }} />
        </Animated.View>
      ) : (
        <>
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" error={error} />
          <Button title="Send reset code" onPress={submit} loading={busy} />
        </>
      )}
    </AuthLayout>
  );
}
