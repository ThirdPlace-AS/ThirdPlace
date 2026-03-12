// ============================================================
// app/(app)/map/[experienceId].tsx
//
// The routable experience detail screen — mounted when the user
// taps a pin on the map (router.push from map/index.tsx) or
// arrives via a deep link (thirdplace://map/EXPERIENCE_ID).
//
// ARCHITECTURE CHOICE — separate route vs inline overlay:
//   We use a dedicated route rather than an inline sheet rendered
//   inside map/index.tsx for three reasons:
//
//   1. Deep links work out of the box. A shared URL like
//      thirdplace://map/abc123 lands directly here.
//   2. The back button behaviour is natural — hardware back on
//      Android and the swipe gesture on iOS both work correctly.
//   3. The map screen doesn't need to manage sheet state. It stays
//      focused on the map; this screen owns the sheet.
//
// VISUAL DESIGN:
//   This screen renders a full-screen transparent overlay over
//   the map (which is still mounted and interactive underneath).
//   The ExperienceDetailSheet slides up from the bottom. Tapping
//   the backdrop (the dimmed area above the sheet) dismisses it.
//
// The ExperienceDetailSheet component owns all data fetching,
// animation, join/leave logic, and guest gating. This screen
// is pure routing glue — it reads the param, passes it down,
// and handles the back navigation.
// ============================================================

import { ExperienceDetailSheet } from "@/components/map/ExperienceDetailSheet";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StatusBar, TouchableWithoutFeedback, View } from "react-native";

export default function ExperienceDetailScreen() {
  const { experienceId } = useLocalSearchParams<{ experienceId: string }>();

  const handleClose = () => {
    // router.back() returns to the map screen. The map remains
    // mounted the whole time (it's in the tab stack), so it
    // never needs to reload its data on return.
    router.back();
  };

  if (!experienceId) {
    // Should never happen — Expo Router only mounts this screen
    // when the param is present in the URL. Safety guard only.
    router.back();
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Backdrop ─────────────────────────────────────────
          A semi-transparent dark overlay over the map.
          Tapping it dismisses the sheet (same as pressing back).
          TouchableWithoutFeedback has zero visual feedback —
          we don't want a ripple/flash on the backdrop tap.      */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.35)",
          }}
        />
      </TouchableWithoutFeedback>

      {/* ── Sheet ────────────────────────────────────────────
          Positioned absolutely so it sits over the backdrop
          and the underlying map. The sheet itself manages its
          own height and animation via Reanimated.              */}
      <ExperienceDetailSheet
        experienceId={experienceId}
        onClose={handleClose}
      />
    </View>
  );
}
