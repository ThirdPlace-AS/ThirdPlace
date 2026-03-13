// ─────────────────────────────────────────────────────────────
// lib/constants.ts
// Single source of truth for every magic number and colour.
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
  DEFAULT_LNG:       10.7522,
  DEFAULT_LAT:       59.9139,
  DEFAULT_ZOOM:      13,
  FETCH_RADIUS_M:    5000,
  REFETCH_THRESH_M:  1000,
  OSM_PADDING_DEG:   0.05,
  CLUSTER_ZOOM:      14,
  MAP_STYLE:         "mapbox://styles/mapbox/light-v11",
} as const;

export const ANIMATION = {
  fast:   150,
  normal: 250,
  slow:   400,
  spring: { damping: 20, stiffness: 200, mass: 0.8 },
} as const;

export const SWIPE = {
  THRESHOLD:    0.35,
  UP_THRESHOLD: -80,
  DECK_SIZE:    3,
  FETCH_RADIUS: 10_000,
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

// ── OSM place type → emoji (shown as map marker) ─────────────
// These are rendered as native Mapbox image assets via <MapboxGL.Images>
export const VENUE_EMOJI: Record<string, string> = {
  cafe:       "☕",
  restaurant: "🍽️",
  bar:        "🍺",
  park:       "🌳",
  library:    "📚",
  gym:        "💪",
  museum:     "🏛️",
  gallery:    "🎨",
  cinema:     "🎬",
  bookshop:   "📖",
  coworking:  "💻",
  other:      "📍",
};

// ── OSM place_type → experience_category enum ─────────────────
// Used when auto-creating a draft experience from an OSM venue tap
export const OSM_TO_EXPERIENCE_CATEGORY: Record<string, string> = {
  cafe:       "coffee",
  restaurant: "food",
  bar:        "social",
  park:       "outdoor",
  library:    "study",
  gym:        "sport",
  museum:     "culture",
  gallery:    "culture",
  cinema:     "culture",
  bookshop:   "study",
  coworking:  "study",
  other:      "social",
};

// ── Venue sheet ───────────────────────────────────────────────
// Number of participants required before chat is activated
export const CHAT_ACTIVATION_THRESHOLD = 2;

export const RECENTS_STORAGE_KEY   = "@thirdplace:recent_searches";
export const MAX_RECENT_SEARCHES   = 12;
export const CAMERA_DEBOUNCE_MS    = 450;
export const LOADING_FAILSAFE_MS   = 20_000;