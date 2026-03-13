// ─────────────────────────────────────────────────────────────
// components/map/SearchBar.tsx
// Smart search bar overlay for the map screen.
//
// Features:
//   • Animated expand on focus (Reanimated, UI thread)
//   • Debounced search via useSearch hook
//   • Categorised results: Experiences / People / Places
//   • Recent searches with individual remove buttons
//   • Proximity label (Xm / Xkm away)
//   • Clear (×) button on active input
//   • Tap result → flyTo + close  |  person → profile nav
//   • Keyboard-aware backdrop to dismiss
//   • Full skeleton while loading
// ─────────────────────────────────────────────────────────────
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useRef } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SearchResult, SearchSection } from "@/hooks/useSearch";
import { ANIMATION, COLOURS, VENUE_EMOJI } from "@/lib/constants";
import type { SearchResultType } from "@/services/supabase/search";

// ── Types ─────────────────────────────────────────────────────
interface Props {
  query: string;
  sections: SearchSection[];
  recentSearches: string[];
  isLoading: boolean;
  isActive: boolean;
  error: string | null;
  onChangeQuery: (q: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onSelectRecent: (q: string) => void;
  onRemoveRecent: (q: string) => void;
  onClearQuery: () => void;
  /** Called when user selects a result with coordinates */
  onFlyTo: (lng: number, lat: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────
const TYPE_ICONS: Record<SearchResultType, string> = {
  experience: "sparkles",
  person: "person",
  place: "location",
};

const TYPE_COLOURS: Record<SearchResultType, string> = {
  experience: COLOURS.accent,
  person: "#A855F7",
  place: "#10B981",
};

function formatDistance(m: number | null): string | null {
  if (m === null || m === undefined) return null;
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function placeEmoji(subtitle: string): string {
  return VENUE_EMOJI[subtitle] ?? "📍";
}

// ── Result row ────────────────────────────────────────────────
const ResultRow = React.memo(function ResultRow({
  item,
  onPress,
}: {
  item: SearchResult;
  onPress: (item: SearchResult) => void;
}) {
  const iconColour = TYPE_COLOURS[item.result_type];
  const dist = formatDistance(item.distance_m);

  return (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {/* Left icon / avatar */}
      {item.result_type === "person" && item.avatar_url ? (
        // Avatar placeholder (real image would use Image component)
        <View style={[styles.resultIcon, { backgroundColor: "#EDE9FE" }]}>
          <Text style={{ fontSize: 16 }}>👤</Text>
        </View>
      ) : item.result_type === "place" ? (
        <View style={[styles.resultIcon, { backgroundColor: "#D1FAE5" }]}>
          <Text style={{ fontSize: 18 }}>{placeEmoji(item.subtitle)}</Text>
        </View>
      ) : (
        <View
          style={[styles.resultIcon, { backgroundColor: COLOURS.accentLight }]}
        >
          <Ionicons
            name={TYPE_ICONS[item.result_type] as any}
            size={18}
            color={iconColour}
          />
        </View>
      )}

      {/* Text block */}
      <View style={styles.resultText}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title || item.subtitle}
        </Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
          {dist && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.resultDist}>{dist}</Text>
            </>
          )}
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={16} color={COLOURS.textTertiary} />
    </TouchableOpacity>
  );
});

// ── Section header ────────────────────────────────────────────
function SectionHeader({
  label,
  type,
}: {
  label: string;
  type: SearchResultType;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View
        style={[styles.sectionDot, { backgroundColor: TYPE_COLOURS[type] }]}
      />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────
function SkeletonRow() {
  return (
    <View style={styles.resultRow}>
      <View style={[styles.resultIcon, styles.skeleton]} />
      <View style={styles.resultText}>
        <View
          style={[styles.skeletonLine, { width: "60%", marginBottom: 6 }]}
        />
        <View style={[styles.skeletonLine, { width: "35%" }]} />
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────
export function SearchBar({
  query,
  sections,
  recentSearches,
  isLoading,
  isActive,
  error,
  onChangeQuery,
  onActivate,
  onDeactivate,
  onSelectRecent,
  onRemoveRecent,
  onClearQuery,
  onFlyTo,
}: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // Reanimated values
  const expandAnim = useSharedValue(0); // 0 = collapsed, 1 = expanded
  const resultsAnim = useSharedValue(0);

  const handleFocus = useCallback(() => {
    onActivate();
    expandAnim.value = withSpring(1, ANIMATION.spring);
    resultsAnim.value = withTiming(1, { duration: ANIMATION.normal });
  }, [onActivate]);

  const handleBlur = useCallback(() => {
    // Don't deactivate on blur — user may be scrolling results
  }, []);

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    expandAnim.value = withSpring(0, ANIMATION.spring);
    resultsAnim.value = withTiming(0, { duration: ANIMATION.fast });
    onDeactivate();
  }, [onDeactivate]);

  const handleResultPress = useCallback(
    (item: SearchResult) => {
      Keyboard.dismiss();
      if (item.result_type === "person") {
        handleDismiss();
        router.push({
          pathname: "/(app)/profile",
          params: { userId: item.id },
        });
        return;
      }
      if (item.latitude != null && item.longitude != null) {
        onFlyTo(item.longitude, item.latitude);
      }
      handleDismiss();
    },
    [handleDismiss, onFlyTo],
  );

  // Animated container style — pill grows into full-width bar
  const containerStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(expandAnim.value, [0, 1], [24, 16]),
    shadowOpacity: interpolate(expandAnim.value, [0, 1], [0.08, 0.18]),
  }));

  // Results panel slides down
  const resultsStyle = useAnimatedStyle(() => ({
    opacity: resultsAnim.value,
    transform: [
      { translateY: interpolate(resultsAnim.value, [0, 1], [-8, 0]) },
    ],
  }));

  // Build flat list data from sections
  type ListItem =
    | { kind: "section"; section: SearchSection }
    | { kind: "result"; item: SearchResult }
    | { kind: "recent"; text: string }
    | { kind: "skeleton" }
    | { kind: "empty" }
    | { kind: "error"; message: string };

  const listData: ListItem[] = [];

  if (isLoading) {
    listData.push(
      { kind: "skeleton" },
      { kind: "skeleton" },
      { kind: "skeleton" },
    );
  } else if (error) {
    listData.push({ kind: "error", message: error });
  } else if (query.trim() && sections.length === 0 && !isLoading) {
    listData.push({ kind: "empty" });
  } else if (query.trim()) {
    for (const section of sections) {
      listData.push({ kind: "section", section });
      for (const result of section.results) {
        listData.push({ kind: "result", item: result });
      }
    }
  } else if (!query.trim() && recentSearches.length > 0) {
    for (const text of recentSearches) {
      listData.push({ kind: "recent", text });
    }
  }

  const showResults = isActive && listData.length > 0;

  return (
    <>
      {/* Backdrop — tap to close */}
      {isActive && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={handleDismiss}
          activeOpacity={1}
        />
      )}

      <View
        style={[styles.wrapper, { top: insets.top + 12 }]}
        pointerEvents="box-none"
      >
        {/* Search input pill */}
        <Animated.View style={[styles.inputContainer, containerStyle]}>
          <Ionicons
            name="search"
            size={18}
            color={isActive ? COLOURS.accent : COLOURS.textSecondary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={onChangeQuery}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Search experiences, people, places…"
            placeholderTextColor={COLOURS.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never" // we use custom clear
          />
          {isLoading && query.length > 0 && (
            <ActivityIndicator
              size="small"
              color={COLOURS.accent}
              style={{ marginRight: 4 }}
            />
          )}
          {query.length > 0 && !isLoading && (
            <TouchableOpacity
              onPress={onClearQuery}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.clearButton}>
                <Ionicons name="close" size={12} color={COLOURS.white} />
              </View>
            </TouchableOpacity>
          )}
          {isActive && query.length === 0 && (
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Results / recents panel */}
        {showResults && (
          <Animated.View style={[styles.resultsPanel, resultsStyle]}>
            {/* Recent header */}
            {!query.trim() && recentSearches.length > 0 && (
              <View style={styles.recentHeader}>
                <Text style={styles.recentHeaderText}>Recent</Text>
              </View>
            )}
            <FlatList
              data={listData}
              keyExtractor={(item, i) => `${item.kind}-${i}`}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => {
                if (item.kind === "section") {
                  return (
                    <SectionHeader
                      label={item.section.label}
                      type={item.section.type}
                    />
                  );
                }
                if (item.kind === "result") {
                  return (
                    <ResultRow item={item.item} onPress={handleResultPress} />
                  );
                }
                if (item.kind === "recent") {
                  return (
                    <TouchableOpacity
                      style={styles.recentRow}
                      onPress={() => onSelectRecent(item.text)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={COLOURS.textTertiary}
                      />
                      <Text style={styles.recentText} numberOfLines={1}>
                        {item.text}
                      </Text>
                      <TouchableOpacity
                        onPress={() => onRemoveRecent(item.text)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="close"
                          size={14}
                          color={COLOURS.textTertiary}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }
                if (item.kind === "skeleton") {
                  return <SkeletonRow />;
                }
                if (item.kind === "empty") {
                  return (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyEmoji}>🔍</Text>
                      <Text style={styles.emptyTitle}>No results found</Text>
                      <Text style={styles.emptySubtitle}>
                        Try a different search term
                      </Text>
                    </View>
                  );
                }
                if (item.kind === "error") {
                  return (
                    <View style={styles.errorState}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={16}
                        color={COLOURS.error}
                      />
                      <Text style={styles.errorText}>{item.message}</Text>
                    </View>
                  );
                }
                return null;
              }}
            />
          </Animated.View>
        )}
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    zIndex: 19,
    backgroundColor: "transparent",
  },
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLOURS.white,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLOURS.textPrimary,
    padding: 0,
    marginRight: 6,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLOURS.textTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    color: COLOURS.accent,
    fontWeight: "600",
  },
  resultsPanel: {
    marginTop: 6,
    backgroundColor: COLOURS.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLOURS.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  // Result row
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLOURS.accentLight,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLOURS.textPrimary,
    marginBottom: 2,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resultSubtitle: {
    fontSize: 13,
    color: COLOURS.textSecondary,
  },
  metaDot: {
    fontSize: 13,
    color: COLOURS.textTertiary,
  },
  resultDist: {
    fontSize: 12,
    color: COLOURS.textTertiary,
  },
  // Recent searches
  recentHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.border,
  },
  recentHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLOURS.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: COLOURS.textPrimary,
  },
  // Skeleton
  skeleton: {
    backgroundColor: COLOURS.surfaceAlt,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLOURS.surfaceAlt,
  },
  // Empty / error
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLOURS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLOURS.textSecondary,
  },
  errorState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
  },
  errorText: {
    fontSize: 13,
    color: COLOURS.error,
    flex: 1,
  },
});
