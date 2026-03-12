// ============================================================
// components/map/CategoryPin.tsx
//
// Custom map pin rendered as a React Native SVG.
// Used in two contexts:
//
//   1. As a Mapbox SymbolLayer image (pre-rendered to base64 PNG
//      and registered with MapboxGL.Images). This is the performant
//      path — Mapbox renders thousands of these natively.
//
//   2. As a plain React Native component for the detail sheet
//      header, category pills, and list items.
//
// WHY NOT JUST USE CIRCLE LAYERS?
//   CircleLayer is simpler but can't show an icon inside the pin.
//   SymbolLayer with a custom image gives us the category icon
//   inside a teardrop shape — much more informative at a glance.
//
// THE MAPBOX IMAGE REGISTRATION PATTERN:
//   MapboxGL.Images is a special component that takes a map of
//   { imageId: require('./image.png') } and registers them with
//   the native GL context. Once registered, SymbolLayer can
//   reference the imageId in its iconImage style property.
//   We register one image per category at map mount time.
// ============================================================

import { CATEGORY_META, COLOURS } from "@/lib/constants";
import type { ExperienceCategory } from "@/types/experience";
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

// ─── Pin sizes ───────────────────────────────────────────────
export type PinSize = "sm" | "md" | "lg";

const PIN_DIMS: Record<
  PinSize,
  { w: number; h: number; r: number; iconSize: number }
> = {
  sm: { w: 24, h: 30, r: 10, iconSize: 10 },
  md: { w: 36, h: 44, r: 15, iconSize: 16 },
  lg: { w: 48, h: 58, r: 20, iconSize: 22 },
};

// ─── SVG teardrop pin ────────────────────────────────────────
// The classic map-pin teardrop shape: a circle on top with a
// pointed tail at the bottom. Drawn as a single SVG Path.
function TearDropPath({
  w,
  h,
  r,
  fill,
  stroke,
}: {
  w: number;
  h: number;
  r: number;
  fill: string;
  stroke: string;
}) {
  // cx/cy = centre of the circle portion
  const cx = w / 2;
  const cy = r + 2;

  // The teardrop is a circle that tapers to a point at (cx, h).
  // We draw it as an arc + two lines meeting at the tip.
  const d = [
    `M ${cx} ${h}`, // Start at tip
    `L ${cx - r * 0.5} ${cy + r * 0.7}`, // Left shoulder
    `A ${r} ${r} 0 1 1 ${cx + r * 0.5} ${cy + r * 0.7}`, // Arc over top
    "Z", // Close back to tip
  ].join(" ");

  return <Path d={d} fill={fill} stroke={stroke} strokeWidth={1.5} />;
}

// ─── Category pin component ──────────────────────────────────
interface CategoryPinProps {
  category: ExperienceCategory | "default";
  size?: PinSize;
  selected?: boolean;
  style?: ViewStyle;
}

export function CategoryPin({
  category,
  size = "md",
  selected = false,
  style,
}: CategoryPinProps) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.social;
  const dims = PIN_DIMS[size];
  const [bgColor] = meta.colors;

  // Selected pins use the brand accent; others use the category colour
  const fillColor = selected ? COLOURS.accent : bgColor;
  const strokeColor = selected ? COLOURS.accentDark : meta.colors[1];

  return (
    <View
      style={[{ width: dims.w, height: dims.h, alignItems: "center" }, style]}
    >
      <Svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
        <TearDropPath
          w={dims.w}
          h={dims.h}
          r={dims.r}
          fill={fillColor}
          stroke={strokeColor}
        />
        {/* Category emoji centred in the circle portion */}
        {/* We use a foreignObject-equivalent via absolute positioning below */}
      </Svg>
      {/* Emoji overlaid on the circle portion of the pin */}
      <View
        style={{
          position: "absolute",
          top: 2,
          left: 0,
          right: 0,
          height: dims.r * 2 + 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{ fontSize: dims.iconSize - 2, lineHeight: dims.iconSize + 2 }}
        >
          {getCategoryEmoji(category)}
        </Text>
      </View>
    </View>
  );
}

// ─── Category pill (for detail sheet / swipe card) ───────────
interface CategoryPillProps {
  category: ExperienceCategory | string;
  size?: "sm" | "md";
}

export function CategoryPill({ category, size = "md" }: CategoryPillProps) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.social;
  const [bg, border] = meta.colors;
  const textSize = size === "sm" ? 11 : 13;
  const padH = size === "sm" ? 8 : 12;
  const padV = size === "sm" ? 4 : 6;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: bg,
        borderRadius: 20,
        paddingHorizontal: padH,
        paddingVertical: padV,
        alignSelf: "flex-start",
        gap: 4,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <Text style={{ fontSize: textSize }}>{getCategoryEmoji(category)}</Text>
      <Text
        style={{
          fontSize: textSize,
          fontWeight: "600",
          color: COLOURS.textPrimary,
        }}
      >
        {meta.label}
      </Text>
    </View>
  );
}

// ─── Emoji map ───────────────────────────────────────────────
export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    outdoor: "🌿",
    food: "🍜",
    social: "🎉",
    music: "🎵",
    sport: "⚡",
    coffee: "☕",
    study: "📚",
    culture: "🎨",
    default: "✨",
  };
  return map[category] ?? map.default;
}
