// ─────────────────────────────────────────────────────────────
// components/discover/SwipeCard.tsx
// Pure UI component. Owns animation values and gesture handler.
// All business logic (what happens on swipe) comes in via props.
// ─────────────────────────────────────────────────────────────
import { Tag } from "@/components/ui";
import { ANIMATION, CATEGORY_META, COLOURS, SWIPE } from "@/lib/constants";
import type { Experience } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
export const CARD_W = SCREEN_W - 32;
export const CARD_H = SCREEN_H * 0.62;
const SWIPE_THRESH = SCREEN_W * SWIPE.THRESHOLD;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SwipeCardProps {
  experience: Experience;
  index: number; // 0 = top of deck, 1/2 = cards behind
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
}

export const SwipeCard = React.memo(
  ({
    experience,
    index,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
  }: SwipeCardProps) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const isTopCard = index === 0;

    const gesture = Gesture.Pan()
      .enabled(isTopCard)
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      })
      .onEnd((e) => {
        "worklet";
        if (e.translationX > SWIPE_THRESH) {
          translateX.value = withTiming(
            SCREEN_W * 1.5,
            { duration: 280 },
            () => {
              runOnJS(onSwipeRight)();
            },
          );
        } else if (e.translationX < -SWIPE_THRESH) {
          translateX.value = withTiming(
            -SCREEN_W * 1.5,
            { duration: 280 },
            () => {
              runOnJS(onSwipeLeft)();
            },
          );
        } else if (e.translationY < SWIPE.UP_THRESHOLD) {
          translateX.value = withSpring(0, ANIMATION.spring);
          translateY.value = withSpring(0, ANIMATION.spring);
          runOnJS(onSwipeUp)();
        } else {
          translateX.value = withSpring(0, ANIMATION.spring);
          translateY.value = withSpring(0, ANIMATION.spring);
        }
      });

    const cardStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + index * -8 },
        {
          rotate: isTopCard
            ? `${interpolate(translateX.value, [-SCREEN_W / 2, 0, SCREEN_W / 2], [-12, 0, 12])}deg`
            : "0deg",
        },
        { scale: isTopCard ? 1 : 1 - index * 0.04 },
      ],
      zIndex: 10 - index,
      position: "absolute",
    }));

    const joinOverlay = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESH],
        [0, 0.85],
        "clamp",
      ),
    }));
    const passOverlay = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_THRESH, 0],
        [0.85, 0],
        "clamp",
      ),
    }));

    const meta = CATEGORY_META[experience.category];
    const [c1] = meta?.colors ?? [COLOURS.accentLight];

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Cover */}
          {experience.cover_image_url ? (
            <Image
              source={{ uri: experience.cover_image_url }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.cover,
                {
                  backgroundColor: c1,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons
                name={(meta?.icon ?? "star") as any}
                size={64}
                color="rgba(79,142,247,0.3)"
              />
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            <View style={{ gap: 6 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Tag category={experience.category} />
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons
                    name="people-outline"
                    size={13}
                    color={COLOURS.textTertiary}
                  />
                  <Text style={{ fontSize: 12, color: COLOURS.textTertiary }}>
                    {experience.participant_count}
                    {experience.max_participants
                      ? `/${experience.max_participants}`
                      : ""}{" "}
                    going
                  </Text>
                </View>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {experience.title}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {experience.description}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name="time-outline"
                size={13}
                color={COLOURS.textTertiary}
              />
              <Text style={{ fontSize: 13, color: COLOURS.textTertiary }}>
                {formatDate(experience.starts_at)}
              </Text>
            </View>
          </View>

          {/* JOIN overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlayJoin, joinOverlay]}
          >
            <View style={styles.overlayLabel}>
              <Text style={styles.overlayText}>JOIN</Text>
            </View>
          </Animated.View>

          {/* PASS overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlayPass, passOverlay]}
          >
            <View
              style={[
                styles.overlayLabel,
                { transform: [{ rotate: "15deg" }] },
              ]}
            >
              <Text style={styles.overlayText}>PASS</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: COLOURS.white,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cover: { width: "100%", height: CARD_H * 0.55 },
  content: { flex: 1, padding: 20, justifyContent: "space-between" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLOURS.textPrimary,
    letterSpacing: -0.5,
  },
  description: { fontSize: 14, color: COLOURS.textSecondary, lineHeight: 20 },
  overlayJoin: {
    borderRadius: 28,
    backgroundColor: COLOURS.success,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayPass: {
    borderRadius: 28,
    backgroundColor: COLOURS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayLabel: {
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    transform: [{ rotate: "-15deg" }],
  },
  overlayText: { color: "#fff", fontSize: 32, fontWeight: "900" },
});
