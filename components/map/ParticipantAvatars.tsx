// ============================================================
// components/map/ParticipantAvatars.tsx
//
// Renders a row of overlapping participant avatars with an
// overflow count label: "👤👤👤 +4 joining"
//
// The overlap is achieved with negative marginLeft on all
// avatars after the first. Each avatar has a white border
// (borderWidth + white backgroundColor behind the image)
// so the overlapping edges stay crisp.
//
// When no avatar_url is available, we render a coloured
// initials circle using a deterministic colour derived from
// the user_id. This guarantees every participant always has
// a visual identity without relying on profile photo uploads.
// ============================================================

import type { Participant } from "@/hooks/useExperienceDetail";
import { COLOURS } from "@/lib/constants";
import React from "react";
import { Image, Text, View } from "react-native";

// Deterministic colour from a string (user_id)
// Maps the first char of the ID to one of 8 hues.
const AVATAR_COLOURS = [
  "#4F8EF7",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

function avatarColour(userId: string): string {
  const code = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
  return AVATAR_COLOURS[code % AVATAR_COLOURS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Single avatar ───────────────────────────────────────────
interface AvatarProps {
  participant: Participant;
  size: number;
  borderColor: string;
  zIndex: number;
  marginLeft: number;
}

function Avatar({
  participant,
  size,
  borderColor,
  zIndex,
  marginLeft,
}: AvatarProps) {
  const bg = avatarColour(participant.user_id);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        zIndex,
        marginLeft: marginLeft,
      }}
    >
      {participant.avatar_url ? (
        <Image
          source={{ uri: participant.avatar_url }}
          style={{
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
          }}
        />
      ) : (
        <Text
          style={{
            fontSize: size * 0.32,
            fontWeight: "700",
            color: COLOURS.white,
            lineHeight: size * 0.4,
          }}
        >
          {initials(participant.display_name)}
        </Text>
      )}
    </View>
  );
}

// ─── Avatar row ──────────────────────────────────────────────
interface ParticipantAvatarsProps {
  participants: Participant[];
  totalCount: number; // server total (may be larger than participants.length)
  size?: number; // avatar diameter in dp
  maxVisible?: number; // max avatars before "+N" overflow
  borderColor?: string;
}

export function ParticipantAvatars({
  participants,
  totalCount,
  size = 36,
  maxVisible = 5,
  borderColor = COLOURS.white,
}: ParticipantAvatarsProps) {
  const visible = participants.slice(0, maxVisible);
  const overflow = totalCount - visible.length;

  if (totalCount === 0) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 13, color: COLOURS.textTertiary }}>
          Be the first to join
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {/* Avatar stack — each overlaps the previous by 8dp */}
      <View style={{ flexDirection: "row" }}>
        {visible.map((p, index) => (
          <Avatar
            key={p.user_id}
            participant={p}
            size={size}
            borderColor={borderColor}
            zIndex={maxVisible - index}
            marginLeft={index === 0 ? 0 : -(size * 0.35)}
          />
        ))}

        {/* Overflow bubble */}
        {overflow > 0 && (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor,
              backgroundColor: COLOURS.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: -(size * 0.35),
              zIndex: 0,
            }}
          >
            <Text
              style={{
                fontSize: size * 0.3,
                fontWeight: "700",
                color: COLOURS.textSecondary,
              }}
            >
              +{overflow}
            </Text>
          </View>
        )}
      </View>

      {/* Label */}
      <Text
        style={{
          marginLeft: 10,
          fontSize: 13,
          color: COLOURS.textSecondary,
          fontWeight: "500",
        }}
      >
        {totalCount === 1 ? "1 person joining" : `${totalCount} joining`}
      </Text>
    </View>
  );
}
