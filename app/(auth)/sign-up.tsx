// ─────────────────────────────────────────────────────────────
// app/(auth)/sign-up.tsx

import { SocialAuthButton } from "@/components/auth/SocialAuthButton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────
export function SignUpScreen() {
  const {
    signUpWithEmail,
    signInWithGoogle,
    signInWithFacebook,
    error,
    clearError,
  } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    setIsLoading(true);
    await signUpWithEmail(email.trim(), password, displayName.trim());
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
  const isReady =
    displayName.length >= 2 && email.includes("@") && password.length >= 8;

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
                Join ThirdPlace
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: COLOURS.textSecondary,
                  marginTop: 6,
                  marginBottom: 32,
                }}
              >
                Find your people, find your place
              </Text>

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
                  <TouchableOpacity onPress={clearError}>
                    <Ionicons name="close" size={16} color={COLOURS.error} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ gap: 12 }}>
                <TextInput
                  style={inputStyle}
                  placeholder="Display name"
                  placeholderTextColor={COLOURS.textTertiary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
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
                {password.length > 0 && password.length < 8 && (
                  <Text style={{ fontSize: 12, color: COLOURS.warning }}>
                    Use at least 8 characters
                  </Text>
                )}
                <Button
                  label="Create account"
                  isLoading={isLoading}
                  onPress={handleSignUp}
                  disabled={!isReady}
                  size="lg"
                />
              </View>

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
                  or sign up with
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
                  onPress={async () => {
                    setIsLoading(true);
                    await signInWithGoogle();
                    setIsLoading(false);
                  }}
                  isLoading={isLoading}
                />
                <SocialAuthButton
                  provider="facebook"
                  onPress={async () => {
                    setIsLoading(true);
                    await signInWithFacebook();
                    setIsLoading(false);
                  }}
                  isLoading={isLoading}
                />
              </View>

              <Text
                style={{
                  fontSize: 12,
                  color: COLOURS.textTertiary,
                  textAlign: "center",
                  marginTop: 24,
                  lineHeight: 18,
                }}
              >
                By creating an account you agree to our Terms of Service and
                Privacy Policy.
              </Text>

              <TouchableOpacity
                onPress={() => router.replace("/(auth)/sign-in")}
                style={{
                  marginTop: 20,
                  marginBottom: 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: COLOURS.textSecondary, fontSize: 15 }}>
                  Already have an account?{" "}
                  <Text style={{ color: COLOURS.accent, fontWeight: "700" }}>
                    Sign in
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

export { SignUpScreen as default } from "./sign-up";

