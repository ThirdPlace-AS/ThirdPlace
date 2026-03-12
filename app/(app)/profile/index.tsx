// ============================================================
// app/(app)/profile/index.tsx
//
// Profile screen — two modes:
//   GUEST: Shows a friendly "what you're missing" screen with
//          a clear CTA to sign up. No confusing empty states.
//   AUTHENTICATED: Full profile (avatar, stats, experiences joined,
//          settings, sign out).
//
// The guest version is treated as a FEATURE SHOWCASE, not an
// error state — it shows what profile looks like with dummy
// blurred content behind a soft overlay. This is the "locked
// room with a window" pattern: curiosity drives conversion.
// ============================================================

import { useGuest } from "@/context/GuestContext";
import { useAuth } from "@/hooks/useAuth";
import { COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Guest profile screen ────────────────────────────────────
function GuestProfileScreen() {
  const { exitGuestMode } = useGuest();

  const handleSignUp = () => {
    exitGuestMode();
    router.replace("/(auth)/sign-up");
  };

  const handleSignIn = () => {
    exitGuestMode();
    router.replace("/(auth)/sign-in");
  };

  // Fake stat cards shown blurred behind the overlay
  // to tease what the real profile looks like
  const fakeStats = [
    { label: "Joined", value: "12" },
    { label: "Created", value: "3" },
    { label: "Friends", value: "28" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={{ paddingHorizontal: 24, paddingTop: 20, marginBottom: 8 }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: "#111827",
              letterSpacing: -0.6,
            }}
          >
            Profile
          </Text>
        </Animated.View>

        {/* ── Blurred preview card ── */}
        <Animated.View
          entering={FadeInUp.delay(150).duration(500)}
          style={{ marginHorizontal: 20, marginBottom: 20 }}
        >
          <View
            style={{
              borderRadius: 24,
              overflow: "hidden",
              backgroundColor: COLOURS.white,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            {/* Fake profile content — blurred */}
            <View style={{ padding: 24, opacity: 0.35 }}>
              {/* Avatar row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: COLOURS.accentLight,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 16,
                  }}
                >
                  <Text style={{ fontSize: 32 }}>👤</Text>
                </View>
                <View>
                  <View
                    style={{
                      width: 120,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: "#E5E7EB",
                      marginBottom: 8,
                    }}
                  />
                  <View
                    style={{
                      width: 80,
                      height: 13,
                      borderRadius: 6,
                      backgroundColor: "#F3F4F6",
                    }}
                  />
                </View>
              </View>

              {/* Stat row */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                {fakeStats.map(({ label, value }) => (
                  <View
                    key={label}
                    style={{
                      flex: 1,
                      backgroundColor: COLOURS.accentLight,
                      borderRadius: 14,
                      padding: 14,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "800",
                        color: COLOURS.accent,
                      }}
                    >
                      {value}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: COLOURS.accent,
                        marginTop: 2,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Lock overlay */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 24,
                  backgroundColor: "rgba(255,255,255,0.55)",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <View
                style={{
                  backgroundColor: COLOURS.white,
                  borderRadius: 20,
                  padding: 20,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                  marginHorizontal: 20,
                }}
              >
                <Text style={{ fontSize: 36, marginBottom: 8 }}>👤</Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#111827",
                    textAlign: "center",
                    marginBottom: 6,
                  }}
                >
                  Your ThirdPlace profile
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#6B7280",
                    textAlign: "center",
                    lineHeight: 18,
                  }}
                >
                  Track experiences, connect with friends, and build your social
                  map.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── What you unlock ── */}
        <Animated.View
          entering={FadeInUp.delay(250).duration(500)}
          style={{ marginHorizontal: 20, marginBottom: 24 }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#9CA3AF",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            With a free account
          </Text>

          {[
            { emoji: "🎉", text: "Join and create experiences" },
            { emoji: "💬", text: "Chat with groups in real time" },
            { emoji: "👥", text: "Add friends and see them on the map" },
            { emoji: "🔖", text: "Save experiences with reminders" },
            { emoji: "📍", text: "Share your location with friends" },
          ].map(({ emoji, text }) => (
            <View
              key={text}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#F9FAFB",
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 14, width: 28 }}>
                {emoji}
              </Text>
              <Text
                style={{ fontSize: 15, color: "#374151", fontWeight: "500" }}
              >
                {text}
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={COLOURS.accent}
                style={{ marginLeft: "auto" }}
              />
            </View>
          ))}
        </Animated.View>

        {/* ── CTAs ── */}
        <Animated.View
          entering={FadeInUp.delay(350).duration(500)}
          style={{ paddingHorizontal: 20 }}
        >
          <TouchableOpacity
            onPress={handleSignUp}
            activeOpacity={0.88}
            style={{
              backgroundColor: COLOURS.accent,
              borderRadius: 16,
              paddingVertical: 17,
              alignItems: "center",
              marginBottom: 12,
              shadowColor: COLOURS.accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.28,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
              Create free account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignIn}
            activeOpacity={0.75}
            style={{
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ color: "#374151", fontSize: 16, fontWeight: "600" }}>
              Sign in to existing account
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Authenticated profile screen ────────────────────────────
function AuthenticatedProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: "#111827",
            letterSpacing: -0.6,
            marginBottom: 24,
          }}
        >
          Profile
        </Text>

        {/* Avatar + name */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLOURS.white,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: COLOURS.accentLight,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
              {user?.email?.split("@")[0] ?? "Explorer"}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {user?.email}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="pencil-outline" size={20} color={COLOURS.accent} />
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={signOut}
          activeOpacity={0.75}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 18,
            backgroundColor: COLOURS.white,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: "#FEE2E2",
            marginTop: 8,
          }}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#EF4444"
            style={{ marginRight: 12 }}
          />
          <Text style={{ fontSize: 16, color: "#EF4444", fontWeight: "600" }}>
            Sign out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Root export — switches on auth state ────────────────────
export default function ProfileScreen() {
  const { isGuest } = useGuest();
  const { session } = useAuth();

  // Guest mode → show the locked preview
  if (isGuest || !session) {
    return <GuestProfileScreen />;
  }

  return <AuthenticatedProfileScreen />;
}
