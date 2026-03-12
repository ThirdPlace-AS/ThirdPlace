// ─────────────────────────────────────────────────────────────
// app/(app)/discover/index.tsx  — Swipe screen (pure JSX)
// ─────────────────────────────────────────────────────────────
import { CARD_H, SwipeDeck } from "@/components/discover/SwipeCard";
import { useSwipeDeck } from "@/hooks/useChat"; // re-exported from hooks file
import { ANIMATION, COLOURS } from "@/lib/constants";
import type { Experience } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
    ActivityIndicator,
    Dimensions,
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
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_H } = Dimensions.get("window");

// ── Detail sheet ──────────────────────────────────────────────
function DetailSheet({
  experience,
  onClose,
  onJoin,
}: {
  experience: Experience | null;
  onClose: () => void;
  onJoin: () => Promise<void>;
}) {
  const translateY = useSharedValue(SCREEN_H);

  useEffect(() => {
    translateY.value = experience
      ? withSpring(0, ANIMATION.spring)
      : withTiming(SCREEN_H, { duration: 300 });
  }, [experience]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!experience) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          inset: 0,
          backgroundColor: COLOURS.white,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          zIndex: 100,
          paddingHorizontal: 24,
          paddingBottom: 40,
        },
        animStyle,
      ]}
    >
      <View style={{ alignItems: "center", paddingTop: 12, marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: COLOURS.border,
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: COLOURS.textPrimary,
            flex: 1,
            letterSpacing: -0.5,
          }}
        >
          {experience.title}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons
            name="close-circle"
            size={28}
            color={COLOURS.textTertiary}
          />
        </TouchableOpacity>
      </View>
      {[
        {
          icon: "calendar-outline",
          text: new Date(experience.starts_at).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        {
          icon: "location-outline",
          text: experience.address || "Location on map",
        },
        {
          icon: "people-outline",
          text: `${experience.participant_count} going${experience.max_participants ? ` · ${experience.max_participants - experience.participant_count} spots left` : ""}`,
        },
      ].map(({ icon, text }) => (
        <View
          key={icon}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: COLOURS.accentLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon as any} size={18} color={COLOURS.accent} />
          </View>
          <Text style={{ fontSize: 15, color: COLOURS.textSecondary, flex: 1 }}>
            {text}
          </Text>
        </View>
      ))}
      <Text
        style={{
          fontSize: 15,
          color: COLOURS.textPrimary,
          lineHeight: 24,
          marginBottom: 24,
        }}
      >
        {experience.description}
      </Text>
      <TouchableOpacity
        onPress={onJoin}
        activeOpacity={0.88}
        style={{
          backgroundColor: COLOURS.accent,
          borderRadius: 18,
          paddingVertical: 18,
          alignItems: "center",
          marginTop: "auto",
        }}
      >
        <Text style={{ color: COLOURS.white, fontSize: 17, fontWeight: "700" }}>
          Join this experience
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const {
    deck,
    isLoading,
    joinedId,
    detailExp,
    swipeLeft,
    swipeRight,
    openDetail,
    closeDetail,
    joinFromDetail,
  } = useSwipeDeck();

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLOURS.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLOURS.accent} />
        <Text style={{ marginTop: 12, color: COLOURS.textSecondary }}>
          Finding experiences…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.background }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: COLOURS.textPrimary,
            letterSpacing: -0.8,
          }}
        >
          Discover
        </Text>
        <Text
          style={{ fontSize: 14, color: COLOURS.textSecondary, marginTop: 2 }}
        >
          {deck.length > 0
            ? `${deck.length} experience${deck.length !== 1 ? "s" : ""} near you`
            : "All caught up!"}
        </Text>
      </View>

      {joinedId && (
        <View
          style={{
            position: "absolute",
            top: 80,
            alignSelf: "center",
            zIndex: 200,
            backgroundColor: COLOURS.success,
            borderRadius: 40,
            paddingHorizontal: 20,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color={COLOURS.white} />
          <Text
            style={{ color: COLOURS.white, fontWeight: "700", fontSize: 15 }}
          >
            Joined!
          </Text>
        </View>
      )}

      {deck.length > 0 ? (
        <View style={{ flex: 1 }}>
          <SwipeDeck
            deck={deck}
            onSwipeLeft={swipeLeft}
            onSwipeRight={swipeRight}
            onSwipeUp={openDetail}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 24,
              marginTop: CARD_H + 24,
            }}
          >
            {[
              {
                icon: "close",
                color: COLOURS.error,
                onPress: swipeLeft,
                big: false,
              },
              {
                icon: "star",
                color: COLOURS.accent,
                onPress: swipeRight,
                big: true,
              },
              {
                icon: "chevron-up",
                color: COLOURS.textSecondary,
                onPress: openDetail,
                big: false,
              },
            ].map(({ icon, color, onPress, big }) => (
              <TouchableOpacity
                key={icon}
                onPress={onPress}
                activeOpacity={0.8}
                style={{
                  width: big ? 64 : 52,
                  height: big ? 64 : 52,
                  borderRadius: big ? 32 : 26,
                  backgroundColor: COLOURS.white,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: color,
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Ionicons
                  name={icon as any}
                  size={big ? 32 : 26}
                  color={color}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 28,
              backgroundColor: COLOURS.accentLight,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={40}
              color={COLOURS.accent}
            />
          </View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: COLOURS.textPrimary,
              textAlign: "center",
            }}
          >
            You've seen everything nearby
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: COLOURS.textSecondary,
              textAlign: "center",
              marginTop: 10,
              lineHeight: 24,
            }}
          >
            Check back later or explore the map.
          </Text>
        </View>
      )}

      <DetailSheet
        experience={detailExp}
        onClose={closeDetail}
        onJoin={joinFromDetail}
      />
    </SafeAreaView>
  );
}
