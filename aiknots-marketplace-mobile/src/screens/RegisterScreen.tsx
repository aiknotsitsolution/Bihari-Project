import React, { useState } from "react";
import { Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";
import AuthLayout from "../components/AuthLayout";
import AnimatedPressable from "../components/AnimatedPressable";
import { Button, Input } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { isEmail } from "../lib/format";
import { USE_MOCK } from "../lib/api";
import { colors } from "../theme";
import type { RootStackParams } from "../types";

export default function RegisterScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { sendOtp, signUp } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const continueRegistration = async () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!isEmail(email)) e.email = "Enter a valid email address";
    if (password.length < (USE_MOCK ? 6 : 8)) e.password = `Use at least ${USE_MOCK ? 6 : 8} characters`;
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      if (USE_MOCK) {
        await sendOtp(email.trim());
        toast.show("Verification code sent");
        setStep(2);
      } else {
        await signUp({ fullName: fullName.trim(), email: email.trim(), password });
        toast.show("Account created");
        nav.popToTop();
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't send the code", "error");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (otp.trim().length < 4) {
      setErrors({ otp: "Enter the code from your email" });
      return;
    }
    setBusy(true);
    try {
      await signUp({ fullName: fullName.trim(), email: email.trim(), password, otp: otp.trim() });
      toast.show("Account created");
      nav.popToTop();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't verify the code", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={step === 1 ? "Create your account" : "Check your email"} subtitle={step === 1 ? "Shop from thousands of sellers" : `We sent a code to ${email}`}>
      {step === 1 ? (
        <Animated.View key="s1" entering={FadeInRight.duration(260)} exiting={FadeOutLeft.duration(160)}>
          <Input label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} placeholder="Your name" error={errors.fullName} />
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" error={errors.email} />
          <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder={`At least ${USE_MOCK ? 6 : 8} characters`} error={errors.password} />
          <Button title={USE_MOCK ? "Send verification code" : "Create account"} onPress={continueRegistration} loading={busy} style={{ marginTop: 6 }} />
        </Animated.View>
      ) : USE_MOCK ? (
        <Animated.View key="s2" entering={FadeInRight.duration(260)} exiting={FadeOutLeft.duration(160)}>
          <Input label="Verification code" icon="keypad-outline" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="6-digit code" error={errors.otp} onSubmitEditing={verify} />
          <Button title="Verify and create account" onPress={verify} loading={busy} />
          <AnimatedPressable onPress={() => setStep(1)} style={{ alignSelf: "center", marginTop: 18 }} scaleTo={0.94}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Change email</Text>
          </AnimatedPressable>
        </Animated.View>
      ) : null}
    </AuthLayout>
  );
}
