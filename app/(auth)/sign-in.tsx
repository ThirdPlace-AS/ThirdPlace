// ─────────────────────────────────────────────────────────────
// app/(auth)/sign-in.tsx
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import {,dAvoidingView,

  Platform,
  ScrollView,
  TextInput,,react-nativ

import { TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/hooks/useAuth";
import { SocialAuthButton } from "@/components/auth/SocialAuthButton";
import { OTPInput } from "@/components/auth/SocialAuthButton";
import { Button, ErrorBanner } from "@/components/ui";

type Mode = "email" | "phone";

export function SignInScreen() {
  const {
    signInWithEmail,
    signInWithGoogle,
    signInWithFacebook,
    signInWithPhone,
    verifyOTP,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const wrap = async (fn: () => Promise<void>) => {
    setIsLoading(true);
    await fn();
    setIsLoading(false);
  };

  const inputStyle = {
    backgroundColor: COLOURS.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLOURS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLOURS.border,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.white }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 28, paddingTop: 20, flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginBottom: 32 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={COLOURS.textPrimary}
              />
            </TouchableOpacity>

            <Animated.View entering={FadeInDown.duration(400)}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "800",
                  color: COLOURS.textPrimary,
                  letterSpacing: -1,
                }}
              >
                Welcome back
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: COLOURS.textSecondary,
                  marginTop: 6,
                  marginBottom: 32,
                }}
              >
                Sign in to continue
              </Text>

              {/* Mode toggle */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: COLOURS.surfaceAlt,
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 24,
                }}
              >
                {(["email", "phone"] as Mode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      setMode(m);
                      clearError();
                      setOtpSent(false);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      backgroundColor:
                        mode === m ? COLOURS.white : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        fontSize: 14,
                        color:
                          mode === m
                            ? COLOURS.textPrimary
                            : COLOURS.textTertiary,
                      }}
                    >
                      {m === "email" ? "Email" : "Phone"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error && (
                <View
                  style={{
                    backgroundColor: COLOURS.errorLight,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={COLOURS.error}
                  />
                  <Text style={{ color: COLOURS.error, fontSize: 13, flex: 1 }}>
                    {error.message}
                  </Text>
                </View>
              )}

              {mode === "email" && (
                <View style={{ gap: 12 }}>
                  <TextInput
                    style={inputStyle}
                    placeholder="Email address"
                    placeholderTextColor={COLOURS.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View>
                    <TextInput
                      style={inputStyle}
                      placeholder="Password"
                      placeholderTextColor={COLOURS.textTertiary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: 16, top: 14 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={COLOURS.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Button
                    label="Sign in"
                    isLoading={isLoading}
                    onPress={() =>
                      wrap(() => signInWithEmail(email.trim(), password))
                    }
                    size="lg"
                  />
                </View>
              )}

              {mode === "phone" && (
                <View style={{ gap: 12 }}>
                  <TextInput
                    style={inputStyle}
                    placeholder="+47 000 00 000"
                    placeholderTextColor={COLOURS.textTertiary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!otpSent}
                  />
                  {otpSent && (
                    <OTPInput
                      value={otp}
                      onChange={setOtp}
                      onComplete={(val) =>
                        wrap(() => verifyOTP(phone.trim(), val))
                      }
                    />
                  )}
                  <Button
                    label={otpSent ? "Verify code" : "Send code"}
                    isLoading={isLoading}
                    onPress={() =>
                      wrap(
                        otpSent
                          ? () => verifyOTP(phone.trim(), otp)
                          : async () => {
                              await signInWithPhone(phone.trim());
                              if (!error) setOtpSent(true);
                            },
                      )
                    }
                    size="lg"
                  />
                  {otpSent && (
                    <Button
                      label="Change number"
                      variant="ghost"
                      onPress={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                    />
                  )}
                </View>
              )}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 24,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: COLOURS.border,
                  }}
                />
                <Text style={{ color: COLOURS.textTertiary, fontSize: 13 }}>
                  or continue with
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: COLOURS.border,
                  }}
                />
              </View>

              <View style={{ gap: 12 }}>
                <SocialAuthButton
                  provider="google"
                  onPress={() => wrap(signInWithGoogle)}
                  isLoading={isLoading}
                />
                <SocialAuthButton
                  provider="facebook"
                  onPress={() => wrap(signInWithFacebook)}
                  isLoading={isLoading}
                />
              </View>

              <TouchableOpacity
                onPress={() => router.replace("/(auth)/sign-up")}
                style={{
                  marginTop: 32,
                  marginBottom: 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: COLOURS.textSecondary, fontSize: 15 }}>
                  No account?{" "}
                  <Text style={{ color: COLOURS.accent, fontWeight: "700" }}>
                    Sign up
                  </Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default SignInScreen;
