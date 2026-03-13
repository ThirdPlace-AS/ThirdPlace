// ─────────────────────────────────────────────────────────────
// components/map/VenueBottomSheet.tsx
// Slides up when a user taps an OSM venue pin.
// Shows venue info + "Start experience here" CTA.
// Built with Reanimated + Gesture Handler — runs on UI thread.
// ─────────────────────────────────────────────────────────────
import React, { useEffect } from "react";
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    Gesture,
    GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ANIMATION, COLOURS, VENUE_EMOJI } from "@/lib/constants";
import type { OSMPlace } from "@/types";

const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_HEIGHT = 260; // px — collapsed/default height
const DISMISS_THRESH = 80; // px drag down to dismiss

interface Props {
  venue: OSMPlace | null;
  visible: boolean;
  isPromoting: boolean;
  error: string | null;
  onDismiss: () => void;
  onStart: () => void;
}

// ── Venue type label ─────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  bar: "Bar & Pub",
  park: "Park",
  library: "Library",
  gym: "Gym",
  museum: "Museum",
  gallery: "Gallery",
  cinema: "Cinema",
  bookshop: "Bookshop",
  coworking: "Coworking Space",
  other: "Venue",
};

export function VenueBottomSheet({
  venue,
  visible,
  isPromoting,
  error,
  onDismiss,
  onStart,
}: Props) {
  const insets = useSafeAreaInsets();

  // translateY: 0 = fully visible, SHEET_HEIGHT = hidden below screen
  const translateY = useSharedValue(SHEET_HEIGHT);
  // Backdrop opacity: 0 = transparent, 0.4 = semi-dark
  const backdropOpacity = useSharedValue(0);
  const startY = useSharedValue(0);

  // Animate in/out when `visible` changes
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(0.4, { duration: ANIMATION.normal });
      translateY.value = withSpring(0, ANIMATION.spring);
    } else {
      backdropOpacity.value = withTiming(0, { duration: ANIMATION.fast });
      translateY.value = withTiming(SHEET_HEIGHT, {
        duration: ANIMATION.normal,
      });
    }
  }, [visible]);

  // Pan gesture — drag down to dismiss
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, startY.value + event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESH || event.velocityY > 500) {
        translateY.value = withTiming(SHEET_HEIGHT, {
          duration: ANIMATION.normal,
        });
        backdropOpacity.value = withTiming(0, { duration: ANIMATION.fast });
        runOnJS(onDismiss)();
      } else {
        translateY.value = withSpring(0, ANIMATION.spring);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Don't mount at all when never shown — saves memory
  if (!visible && !venue) return null;

  const emoji = VENUE_EMOJI[venue?.place_type ?? "other"] ?? "📍";
  const typeLabel = TYPE_LABELS[venue?.place_type ?? "other"] ?? "Venue";

  return (
    <>
      {/* Semi-transparent backdrop — tap to dismiss */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Sheet itself */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Venue header */}
          <View style={styles.header}>
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>{emoji}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.venueName} numberOfLines={1}>
                {venue?.name ?? ""}
              </Text>
              <Text style={styles.venueType}>{typeLabel}</Text>
            </View>
          </View>

          {/* Address */}
          {!!venue?.address && (
            <View style={styles.addressRow}>
              <Text style={styles.addressIcon}>📍</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {venue.address}
              </Text>
            </View>
          )}

          {/* Error state */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaButton, isPromoting && styles.ctaButtonDisabled]}
            onPress={onStart}
            disabled={isPromoting}
            activeOpacity={0.85}
          >
            {isPromoting ? (
              <ActivityIndicator color={COLOURS.white} size="small" />
            ) : (
              <>
                <Text style={styles.ctaIcon}>✨</Text>
                <Text style={styles.ctaText}>Start an experience here</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Hint */}
          <Text style={styles.hint}>
            Others nearby can join and chat once 2 people are in
          </Text>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000",
    zIndex: 10,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 11,
    backgroundColor: COLOURS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    // Elevation (Android)
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOURS.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  emojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLOURS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 26,
  },
  headerText: {
    flex: 1,
  },
  venueName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLOURS.textPrimary,
    letterSpacing: -0.3,
  },
  venueType: {
    fontSize: 13,
    color: COLOURS.textSecondary,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  addressIcon: {
    fontSize: 12,
  },
  addressText: {
    fontSize: 13,
    color: COLOURS.textSecondary,
    flex: 1,
  },
  errorBanner: {
    backgroundColor: COLOURS.errorLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: COLOURS.error,
  },
  ctaButton: {
    backgroundColor: COLOURS.accent,
    borderRadius: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaIcon: {
    fontSize: 18,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLOURS.white,
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 12,
    color: COLOURS.textTertiary,
    textAlign: "center",
  },
});
