// ============================================================
// components/ui/GuestGate.tsx
//
// A reusable component that wraps any action or section that
// requires authentication. When a guest triggers the action,
// instead of performing it, GuestGate renders a bottom sheet
// explaining what they're missing and offering a clear path
// to sign up.
//
// USAGE — two patterns:
//
// Pattern A: Wrap a pressable action (e.g., the Join button)
//   <GuestGate featureName="join experiences">
//     <JoinButton onPress={handleJoin} />
//   </GuestGate>
//
// Pattern B: Gate an entire screen section
//   const { showGate, GateSheet } = useGuestGate('read messages');
//   ...
//   <GateSheet />
//   <TouchableOpacity onPress={showGate}>...</TouchableOpacity>
//
// The component uses Reanimated for the slide-up animation so
// the sheet feels native — no JS-thread jank on the modal entry.
// ============================================================

import { COLOURS } from "@/lib/constants";
import { router } from "expo-router";
import React, { useCallback, useState, type ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ─── Inline import needed for the overlay ───────────────────
import { useGuest } from "@/context/GuestContext";

// ─── Feature-specific messaging ─────────────────────────────
// Each gated feature gets a tailored headline and subtext so
// the prompt feels contextual, not generic.
const FEATURE_COPY: Record<
  string,
  { headline: string; body: string; emoji: string }
> = {
  "join experiences": {
    emoji: "🎉",
    headline: "Join the experience",
    body: "Create a free account to join activities, meet people nearby, and build your social map.",
  },
  "create experiences": {
    emoji: "✨",
    headline: "Host your own experience",
    body: "Sign up to create experiences, invite others, and put your favourite spots on the map.",
  },
  "read messages": {
    emoji: "💬",
    headline: "Chat with the group",
    body: "Sign up to read and send messages in experience group chats.",
  },
  "send messages": {
    emoji: "✉️",
    headline: "Send a message",
    body: "Create a free account to chat with others in this experience.",
  },
  "save experiences": {
    emoji: "🔖",
    headline: "Save for later",
    body: "Sign up to bookmark experiences and get reminders before they start.",
  },
  "view profile": {
    emoji: "👤",
    headline: "Your ThirdPlace profile",
    body: "Sign up to build your profile, track experiences you've joined, and connect with friends.",
  },
  "share location": {
    emoji: "📍",
    headline: "Share your location",
    body: "Sign up to let friends see where you are on the map in real time.",
  },
  default: {
    emoji: "🗝️",
    headline: "Unlock this feature",
    body: "Create a free account to get the full ThirdPlace experience.",
  },
};

// ─── Sheet component ─────────────────────────────────────────

interface GuestGateSheetProps {
  visible: boolean;
  featureName: string;
  onClose: () => void;
}

function GuestGateSheet({
  visible,
  featureName,
  onClose,
}: GuestGateSheetProps) {
  const { exitGuestMode } = useGuest();
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  // Animate in when visible flips to true
  React.useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 280,
        mass: 0.8,
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(400, { damping: 20, stiffness: 300 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const copy = FEATURE_COPY[featureName] ?? FEATURE_COPY.default;

  const handleSignUp = () => {
    onClose();
    exitGuestMode();
    // Short delay so the sheet dismisses before navigation
    setTimeout(() => router.push("/(auth)/sign-up"), 200);
  };

  const handleSignIn = () => {
    onClose();
    exitGuestMode();
    setTimeout(() => router.push("/(auth)/sign-in"), 200);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop — tapping it dismisses the sheet */}
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <Animated.View
          style={[
            {
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.45)",
            },
            backdropStyle,
          ]}
        />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: COLOURS.white,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 44 : 28,
            paddingHorizontal: 24,
            // Subtle shadow for depth
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 20,
            elevation: 24,
          },
          sheetStyle,
        ]}
      >
        {/* Drag handle */}
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#E5E7EB",
            alignSelf: "center",
            marginBottom: 24,
          }}
        />

        {/* Emoji */}
        <Text style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>
          {copy.emoji}
        </Text>

        {/* Headline */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: "#111827",
            textAlign: "center",
            marginBottom: 10,
            letterSpacing: -0.3,
          }}
        >
          {copy.headline}
        </Text>

        {/* Body */}
        <Text
          style={{
            fontSize: 15,
            color: "#6B7280",
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 28,
            paddingHorizontal: 8,
          }}
        >
          {copy.body}
        </Text>

        {/* Primary CTA — Sign Up */}
        <TouchableOpacity
          onPress={handleSignUp}
          activeOpacity={0.88}
          style={{
            backgroundColor: COLOURS.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
            // Subtle elevation
            shadowColor: COLOURS.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            Create free account
          </Text>
        </TouchableOpacity>

        {/* Secondary — Sign In */}
        <TouchableOpacity
          onPress={handleSignIn}
          activeOpacity={0.75}
          style={{
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: "#E5E7EB",
          }}
        >
          <Text style={{ color: "#374151", fontSize: 15, fontWeight: "600" }}>
            I already have an account
          </Text>
        </TouchableOpacity>

        {/* Dismiss link */}
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.6}
          style={{ paddingTop: 16, alignItems: "center" }}
        >
          <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
            Continue browsing as guest
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Wrapper component (Pattern A) ──────────────────────────

interface GuestGateProps {
  /**
   * Key from FEATURE_COPY — determines the tailored message shown.
   * Falls back to 'default' if the key isn't recognised.
   */
  featureName: string;
  children: ReactNode;
  /**
   * If true, the gate is permanently disabled (user is authenticated).
   * Pass `!isGuest` from useGuest() to keep usage sites clean.
   */
  disabled?: boolean;
}

/**
 * Wraps any child. If the user is a guest and interacts with the
 * child, the GuestGateSheet appears instead of the action firing.
 *
 * @example
 * <GuestGate featureName="join experiences" disabled={!isGuest}>
 *   <JoinButton onPress={handleJoin} />
 * </GuestGate>
 */
export function GuestGate({
  featureName,
  children,
  disabled = false,
}: GuestGateProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const { isGuest } = useGuest();

  // If the user is authenticated (or disabled=true), render children as-is
  if (!isGuest || disabled) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Intercept taps with an invisible overlay */}
      <View style={{ position: "relative" }}>
        {children}
        <Pressable
          style={{
            ...StyleSheet.absoluteFillObject,
            zIndex: 10,
          }}
          onPress={() => setSheetVisible(true)}
        />
      </View>

      <GuestGateSheet
        visible={sheetVisible}
        featureName={featureName}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

// ─── Hook (Pattern B) ────────────────────────────────────────

/**
 * Hook for imperative control — use when you can't wrap children
 * (e.g., programmatic actions, screen-level gates).
 *
 * @example
 * const { showGate, GateSheet } = useGuestGate('read messages');
 * ...
 * <GateSheet />
 * <TouchableOpacity onPress={isGuest ? showGate : openChat}>...
 */
export function useGuestGate(featureName: string) {
  const [sheetVisible, setSheetVisible] = useState(false);

  const showGate = useCallback(() => setSheetVisible(true), []);
  const hideGate = useCallback(() => setSheetVisible(false), []);

  const GateSheet = useCallback(
    () => (
      <GuestGateSheet
        visible={sheetVisible}
        featureName={featureName}
        onClose={hideGate}
      />
    ),
    [sheetVisible, featureName, hideGate],
  );

  return { showGate, hideGate, GateSheet };
}
