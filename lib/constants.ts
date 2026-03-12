// ─────────────────────────────────────────────────────────────
// lib/constants.ts
// Single source of truth for every magic number and colour.
// Import from here — never hardcode values in components.
// ─────────────────────────────────────────────────────────────

export const COLOURS = {
  // ── Brand ────────────────────────────────────────────────
  accent:       "#4F8EF7",
  accentLight:  "#EBF2FF",
  accentDark:   "#2563EB",

  // ── Neutrals ─────────────────────────────────────────────
  white:        "#FFFFFF",
  background:   "#F9FAFB",
  surface:      "#FFFFFF",
  surfaceAlt:   "#F3F4F6",
  border:       "#E5E7EB",
  borderFocus:  "#4F8EF7",

  // ── Text ─────────────────────────────────────────────────
  textPrimary:   "#111827",
  textSecondary: "#6B7280",
  textTertiary:  "#9CA3AF",
  textInverse:   "#FFFFFF",

  // ── Semantic ─────────────────────────────────────────────
  success:      "#10B981",
  successLight: "#D1FAE5",
  error:        "#EF4444",
  errorLight:   "#FEE2E2",
  warning:      "#F59E0B",
  warningLight: "#FEF3C7",

  // ── Map ──────────────────────────────────────────────────
  mapPin:       "#4F8EF7",
  mapPinOSM:    "#6B7280",
  mapFriend:    "#10B981",
  mapCluster:   "#4F8EF7",
} as const;

export const MAP_CONFIG = {
  DEFAULT_LNG:       10.7522,   // Oslo city centre
  DEFAULT_LAT:       59.9139,
  DEFAULT_ZOOM:      13,
  FETCH_RADIUS_M:    5000,      // Metres radius for Supabase queries
  REFETCH_THRESH_M:  1000,      // Move this far before re-fetching
  OSM_PADDING_DEG:   0.05,      // Degrees padding for OSM bbox
  CLUSTER_ZOOM:      14,        // Zoom above which clustering is disabled
  MAP_STYLE:         "mapbox://styles/mapbox/light-v11",
} as const;

export const ANIMATION = {
  fast:   150,
  normal: 250,
  slow:   400,
  spring: { damping: 20, stiffness: 200, mass: 0.8 },
} as const;

export const SWIPE = {
  THRESHOLD:    0.35,   // Fraction of screen width to trigger swipe decision
  UP_THRESHOLD: -80,    // Pixels upward to trigger detail expand
  DECK_SIZE:    3,      // Max cards rendered at once
  FETCH_RADIUS: 10_000, // Metres radius for discover fetch
} as const;

export const CATEGORY_META: Record<
  string,
  { icon: string; label: string; colors: [string, string] }
> = {
  outdoor: { icon: "leaf-outline",           label: "Outdoor",  colors: ["#D1FAE5", "#6EE7B7"] },
  food:    { icon: "restaurant-outline",      label: "Food",     colors: ["#FEF3C7", "#FCD34D"] },
  social:  { icon: "people-outline",          label: "Social",   colors: ["#EDE9FE", "#C4B5FD"] },
  music:   { icon: "musical-notes-outline",   label: "Music",    colors: ["#FCE7F3", "#F9A8D4"] },
  sport:   { icon: "barbell-outline",         label: "Sport",    colors: ["#DBEAFE", "#93C5FD"] },
  coffee:  { icon: "cafe-outline",            label: "Coffee",   colors: ["#FFF7ED", "#FED7AA"] },
  study:   { icon: "book-outline",            label: "Study",    colors: ["#F0FDF4", "#86EFAC"] },
  culture: { icon: "library-outline",         label: "Culture",  colors: ["#FFF1F2", "#FDA4AF"] },
};

export const RECENTS_STORAGE_KEY   = "@thirdplace:recent_searches";
export const MAX_RECENT_SEARCHES   = 12;
export const CAMERA_DEBOUNCE_MS    = 450;
export const LOADING_FAILSAFE_MS   = 20_000;