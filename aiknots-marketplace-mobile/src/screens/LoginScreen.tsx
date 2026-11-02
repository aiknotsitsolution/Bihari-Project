import React, { useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AuthLayout from "../components/AuthLayout";
import AnimatedPressable from "../components/AnimatedPressable";
import { Button, Input } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { isEmail } from "../lib/format";
import { colors } from "../theme";
import type { RootStackParams } from "../types";

export default function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { signIn } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = async () => {
    const e: typeof errors = {};
    if (!isEmail(email)) e.email = "Enter a valid email address";
    if (password.length < 4) e.password = "Enter your password";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      toast.show("Signed in");
      nav.goBack();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't sign in", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see your orders and saved items">
      <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" error={errors.email} />
      <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry={!show} placeholder="Your password" error={errors.password} onSubmitEditing={submit} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
        <AnimatedPressable onPress={() => setShow((v) => !v)} scaleTo={0.94}>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>{show ? "Hide password" : "Show password"}</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={() => nav.navigate("ForgotPassword")} scaleTo={0.94}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Forgot password?</Text>
        </AnimatedPressable>
      </View>
      <Button title="Sign in" onPress={submit} loading={busy} />
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 22, gap: 6 }}>
        <Text style={{ color: colors.muted }}>New here?</Text>
        <AnimatedPressable onPress={() => nav.navigate("Register")} scaleTo={0.94}>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>Create an account</Text>
        </AnimatedPressable>
      </View>
    </AuthLayout>
  );
}
