// ============================================================
// components/map/ExperienceDetailSheet.tsx
//
// The experience detail bottom sheet — the core interaction
// surface for the map screen.
//
// TWO HEIGHT STATES:
//   PEEK     (280dp) — visible when you first tap a pin.
//            Shows: cover image, title, category, time, participant
//            count, Join button. Enough to decide "am I interested?"
//
//   EXPANDED (70% screen height) — after dragging up or tapping
//            the expand chevron. Shows: full description, participant
//            avatar row, creator info, address, Open in Chat button.
//
// ANIMATION:
//   A single Reanimated shared value `sheetY` drives all motion.
//   The drag handle gesture updates `sheetY` directly (on the UI
//   thread via worklets). This achieves true 60fps drag without
//   any JS thread involvement — the JS thread only runs on
//   gesture END to snap to the nearest state.
//
// GUEST GATE:
//   Join and Chat buttons are wrapped in useGuestGate().
//   Guests see the full sheet content but can't act on it.
//
// NAVIGATION:
//   This component is used in two ways:
//   a) Inside app/(app)/map/[experienceId].tsx as a full screen
//   b) As an inline overlay on the map (when a pin is tapped but
//      you don't want to navigate away from the map view)
//   The `onClose` prop handles both — it's either router.back()
//   or a local state setter.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useGuestGate } from "@/components/ui/GuestGate";
import { useGuest } from "@/context/GuestContext";
import { useExperienceDetail } from "@/hooks/useExperienceDetail";
import { CATEGORY_META, COLOURS } from "@/lib/constants";
import { CategoryPill } from "./CategoryPin";
import { ParticipantAvatars } from "./ParticipantAvatars";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// The two snap points for the sheet
const PEEK_HEIGHT = 300;
const EXPANDED_HEIGHT = SCREEN_H * 0.72;

// Snap threshold — if the user releases the drag past this
// fraction of the distance between peek and expanded, we snap
// to expanded. Below it, we snap back to peek.
const SNAP_THRESHOLD = 0.38;

// ─── Time formatting helpers ─────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();

  if (diff < 0) return "Started";
  if (diff < 3_600_000) return `In ${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `Today · ${formatTime(iso)}`;
  if (diff < 172_800_000) return `Tomorrow · ${formatTime(iso)}`;
  return (
    d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    formatTime(iso)
  );
}

function isHappeningNow(startsAt: string, endsAt: string | null): boolean {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 7_200_000;
  return now >= start && now <= end;
}

// ─── Skeleton loading state ──────────────────────────────────
function SheetSkeleton() {
  return (
    <View style={{ padding: 24, gap: 16 }}>
      <View
        style={{
          height: 180,
          borderRadius: 16,
          backgroundColor: COLOURS.surfaceAlt,
        }}
      />
      <View
        style={{
          height: 24,
          width: "60%",
          borderRadius: 12,
          backgroundColor: COLOURS.surfaceAlt,
        }}
      />
      <View
        style={{
          height: 16,
          width: "40%",
          borderRadius: 8,
          backgroundColor: COLOURS.surfaceAlt,
        }}
      />
      <View
        style={{
          height: 16,
          width: "80%",
          borderRadius: 8,
          backgroundColor: COLOURS.surfaceAlt,
        }}
      />
      <View
        style={{
          height: 52,
          borderRadius: 14,
          backgroundColor: COLOURS.surfaceAlt,
          marginTop: 8,
        }}
      />
    </View>
  );
}

// ─── Main sheet component ─────────────────────────────────────
interface ExperienceDetailSheetProps {
  experienceId: string;
  onClose: () => void;
  /** If true, renders as a full screen (for the [experienceId].tsx route) */
  fullScreen?: boolean;
}

export function ExperienceDetailSheet({
  experienceId,
  onClose,
  fullScreen = false,
}: ExperienceDetailSheetProps) {
  const {
    experience,
    participants,
    isLoading,
    isJoining,
    hasJoined,
    isFull,
    error,
    toggleJoin,
  } = useExperienceDetail(experienceId);

  const { isGuest } = useGuest();
  const { showGate: showJoinGate, GateSheet: JoinGateSheet } =
    useGuestGate("join experiences");
  const { showGate: showChatGate, GateSheet: ChatGateSheet } =
    useGuestGate("read messages");

  // ── Sheet animation ────────────────────────────────────────
  // sheetY: 0 = expanded top edge, EXPANDED_HEIGHT - PEEK_HEIGHT = peek
  const sheetY = useSharedValue(EXPANDED_HEIGHT - PEEK_HEIGHT);
  const isExpanded = useSharedValue(false);
  const startY = useSharedValue(0);

  // Entrance animation — sheet slides up from bottom on mount
  useEffect(() => {
    sheetY.value = withSpring(EXPANDED_HEIGHT - PEEK_HEIGHT, {
      damping: 26,
      stiffness: 300,
    });
  }, []);

  const expand = useCallback(() => {
    "worklet";
    sheetY.value = withSpring(0, { damping: 24, stiffness: 280 });
    isExpanded.value = true;
  }, []);

  const collapse = useCallback(() => {
    "worklet";
    sheetY.value = withSpring(EXPANDED_HEIGHT - PEEK_HEIGHT, {
      damping: 24,
      stiffness: 280,
    });
    isExpanded.value = false;
  }, []);

  // Pan gesture — runs entirely on the UI thread (worklet)
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startY.value = sheetY.value;
    })
    .onUpdate((event) => {
      const next = startY.value + event.translationY;
      sheetY.value = Math.max(0, Math.min(EXPANDED_HEIGHT - PEEK_HEIGHT, next));
    })
    .onEnd((event) => {
      const peekY = EXPANDED_HEIGHT - PEEK_HEIGHT;
      const totalTravel = peekY;
      const progress = 1 - sheetY.value / totalTravel;

      if (event.velocityY < -400 || progress > SNAP_THRESHOLD) {
        expand();
        runOnJS(Haptics.selectionAsync)();
      } else {
        collapse();
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  // Animate the chevron icon rotation
  const chevronStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      sheetY.value,
      [0, EXPANDED_HEIGHT - PEEK_HEIGHT],
      [180, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ rotate: `${rotate}deg` }] };
  });

  // Content opacity — only fully visible when expanded
  const expandedContentOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      sheetY.value,
      [0, (EXPANDED_HEIGHT - PEEK_HEIGHT) * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // ── Handlers ──────────────────────────────────────────────
  const handleJoinPress = async () => {
    if (isGuest) {
      showJoinGate();
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleJoin();
  };

  const handleChatPress = () => {
    if (isGuest) {
      showChatGate();
      return;
    }
    router.push({
      pathname: "/(app)/chat/[roomId]",
      params: { roomId: experienceId },
    });
  };

  const handleMapPress = () => {
    if (!experience) return;
    const url = Platform.select({
      ios: `maps://?daddr=${experience.latitude},${experience.longitude}`,
      android: `geo:${experience.latitude},${experience.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  // ── Sheet container ────────────────────────────────────────
  const sheetContainer = (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: EXPANDED_HEIGHT,
            backgroundColor: COLOURS.white,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 24,
          },
          sheetStyle,
        ]}
      >
        {/* ── Drag handle ───────────────────────────────── */}
        <View
          style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#E5E7EB",
            }}
          />
        </View>

        {/* ── Collapse / close row ──────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 4,
          }}
        >
          {/* Expand/collapse chevron */}
          <TouchableOpacity
            onPress={() => {
              if (isExpanded.value) {
                collapse();
              } else {
                expand();
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Animated.View style={chevronStyle}>
              <Ionicons
                name="chevron-up"
                size={22}
                color={COLOURS.textTertiary}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: COLOURS.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={16} color={COLOURS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <SheetSkeleton />
        ) : error ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Ionicons
              name="alert-circle-outline"
              size={40}
              color={COLOURS.error}
            />
            <Text
              style={{
                marginTop: 12,
                color: COLOURS.error,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          </View>
        ) : experience ? (
          <ScrollView
            scrollEnabled={isExpanded.value}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* ── Cover image ────────────────────────────── */}
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              {experience.cover_image_url ? (
                <Image
                  source={{ uri: experience.cover_image_url }}
                  style={{ width: "100%", height: 180, borderRadius: 18 }}
                  resizeMode="cover"
                />
              ) : (
                // Category-colour placeholder when no cover image
                <View
                  style={{
                    width: "100%",
                    height: 160,
                    borderRadius: 18,
                    backgroundColor: CATEGORY_BG(experience.category),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 56 }}>
                    {getCategoryEmoji(experience.category)}
                  </Text>
                </View>
              )}

              {/* "Happening now" badge over the image */}
              {isHappeningNow(experience.starts_at, experience.ends_at) && (
                <View
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 28,
                    backgroundColor: COLOURS.success,
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {/* Pulsing dot — simple animated approach */}
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#fff",
                    }}
                  />
                  <Text
                    style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}
                  >
                    LIVE
                  </Text>
                </View>
              )}
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              {/* ── Category pill + time ─────────────────── */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <CategoryPill category={experience.category} size="sm" />
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={COLOURS.textTertiary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLOURS.textTertiary,
                      fontWeight: "500",
                    }}
                  >
                    {formatDate(experience.starts_at)}
                  </Text>
                </View>
              </View>

              {/* ── Title ───────────────────────────────── */}
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: COLOURS.textPrimary,
                  letterSpacing: -0.4,
                  marginBottom: 6,
                  lineHeight: 28,
                }}
                numberOfLines={2}
              >
                {experience.title}
              </Text>

              {/* ── Address ─────────────────────────────── */}
              {experience.address ? (
                <TouchableOpacity
                  onPress={handleMapPress}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 14,
                  }}
                >
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={COLOURS.accent}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLOURS.accent,
                      fontWeight: "500",
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {experience.address}
                  </Text>
                  <Ionicons
                    name="open-outline"
                    size={12}
                    color={COLOURS.accent}
                  />
                </TouchableOpacity>
              ) : null}

              {/* ── Participants ─────────────────────────── */}
              <View style={{ marginBottom: 18 }}>
                <ParticipantAvatars
                  participants={participants}
                  totalCount={experience.participant_count}
                  size={32}
                  maxVisible={5}
                />
                {experience.max_participants && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLOURS.textTertiary,
                      marginTop: 4,
                    }}
                  >
                    {isFull
                      ? "This experience is full"
                      : `${experience.max_participants - experience.participant_count} spots left`}
                  </Text>
                )}
              </View>

              {/* ── Action buttons ───────────────────────── */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                {/* Join / Leave */}
                <TouchableOpacity
                  onPress={handleJoinPress}
                  disabled={isJoining || (isFull && !hasJoined)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: hasJoined
                      ? COLOURS.successLight
                      : isFull
                        ? COLOURS.surfaceAlt
                        : COLOURS.accent,
                    borderWidth: hasJoined ? 1.5 : 0,
                    borderColor: COLOURS.success,
                    flexDirection: "row",
                    gap: 6,
                    // Shadow on Join (not on Leave)
                    shadowColor: hasJoined ? "transparent" : COLOURS.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: hasJoined ? 0 : 5,
                  }}
                >
                  {isJoining ? (
                    <ActivityIndicator
                      size="small"
                      color={hasJoined ? COLOURS.success : "#fff"}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          hasJoined
                            ? "checkmark-circle"
                            : isFull
                              ? "ban-outline"
                              : "add-circle-outline"
                        }
                        size={18}
                        color={
                          hasJoined
                            ? COLOURS.success
                            : isFull
                              ? COLOURS.textTertiary
                              : "#fff"
                        }
                      />
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "700",
                          color: hasJoined
                            ? COLOURS.success
                            : isFull
                              ? COLOURS.textTertiary
                              : "#fff",
                        }}
                      >
                        {hasJoined ? "Joined" : isFull ? "Full" : "Join"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Chat */}
                <TouchableOpacity
                  onPress={handleChatPress}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: COLOURS.accentLight,
                    flexDirection: "row",
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color={COLOURS.accent}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: COLOURS.accent,
                    }}
                  >
                    Chat
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Expanded content (description etc.) ─── */}
              <Animated.View style={expandedContentOpacity}>
                {experience.description ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: COLOURS.textTertiary,
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      About
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: COLOURS.textSecondary,
                        lineHeight: 22,
                      }}
                    >
                      {experience.description}
                    </Text>
                  </View>
                ) : null}

                {/* End time */}
                {experience.ends_at && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 12,
                      borderTopWidth: 1,
                      borderTopColor: COLOURS.border,
                    }}
                  >
                    <Ionicons
                      name="hourglass-outline"
                      size={16}
                      color={COLOURS.textTertiary}
                    />
                    <Text
                      style={{ fontSize: 13, color: COLOURS.textSecondary }}
                    >
                      Ends {formatDate(experience.ends_at)}
                    </Text>
                  </View>
                )}

                {/* Capacity */}
                {experience.max_participants && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 12,
                      borderTopWidth: 1,
                      borderTopColor: COLOURS.border,
                    }}
                  >
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color={COLOURS.textTertiary}
                    />
                    <Text
                      style={{ fontSize: 13, color: COLOURS.textSecondary }}
                    >
                      Max {experience.max_participants} participants
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          </ScrollView>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );

  // Guest gate sheets rendered outside the sheet so they can
  // cover the entire screen (they're Modals)
  return (
    <>
      <JoinGateSheet />
      <ChatGateSheet />
      {sheetContainer}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function CATEGORY_BG(category: string): string {
  return CATEGORY_META[category]?.colors[0] ?? COLOURS.accentLight;
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    outdoor: "🌿",
    food: "🍜",
    social: "🎉",
    music: "🎵",
    sport: "⚡",
    coffee: "☕",
    study: "📚",
    culture: "🎨",
  };
  return map[category] ?? "✨";
}
