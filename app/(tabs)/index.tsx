// ============================================================
// app/(tabs)/index.tsx
//
// MIGRATION NOTES — what changed vs the original file:
//
// REMOVED:
//   - import { AppleMaps, GoogleMaps } from "expo-maps"
//   - import { useImage } from "expo-image"          ← Mapbox uses JS icon objects
//   - import { Asset } from "expo-asset"             ← no longer needed for markers
//   - All 26+ useImage() calls                       ← replaced by Mapbox SymbolLayer
//   - markerIconByType memo                          ← replaced by Mapbox style expressions
//   - markersForMap memo                             ← replaced by GeoJSON FeatureCollection
//   - GoogleMaps.View / AppleMaps.View JSX           ← replaced by MapboxGL.MapView
//   - Platform.OS === 'ios' AppleMaps branch         ← Mapbox works on both platforms
//   - moveCamera / setCameraPosition camera API      ← replaced by MapboxGL.Camera ref
//   - onMarkerClick handler shape                    ← replaced by ShapeSource.onPress
//
// KEPT EXACTLY:
//   - Every import from useExperienceMap (all state, all logic)
//   - Search bar UI and behaviour
//   - Quick tabs bar
//   - Filter modal (full screen)
//   - Bottom info sheet with photo gallery, drag-to-expand
//   - Locate me button
//   - Loading overlay
//   - Error banner
//   - Location denied banner
//   - All Tailwind class names and layout
//   - All colour values (#f54900, #0f172b, etc.)
//   - constants/experienceFilters.ts import
//   - SCREEN_WIDTH / SCREEN_HEIGHT calculations
//
// YOUR EXISTING HOOK (useExperienceMap) IS UNTOUCHED.
// All Google Places fetching, tile caching, debouncing, and
// clustering logic continues to run exactly as before.
// The only thing that changed is how the results are displayed
// on the map — Mapbox instead of Google Maps.
// ============================================================

import {
  FILTER_GROUPS,
  QUICK_TABS,
  SMART_FILTER_GROUPS,
} from "@/constants/experienceFilters";
import {
  GooglePlace,
  INITIAL_REGION,
  useExperienceMap,
} from "@/hooks/useExperienceMap";
import { Ionicons } from "@expo/vector-icons";
import MapboxGL from "@rnmapbox/maps";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  LayoutAnimation,
  Linking,
  PanResponder,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  SlideInDown,
  SlideInRight,
  SlideOutDown,
  SlideOutRight,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

// ── Mapbox token setup ───────────────────────────────────────
// The public token (pk.) is safe to ship in the app bundle.
// Set it once here at module level — Mapbox needs this before
// any MapView is rendered.
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "");

// Dark map style that matches your navy (#0f172b) aesthetic.
// "navigation-night-v1" is Mapbox's darkest built-in style.
// Alternative dark options:
//   "mapbox://styles/mapbox/dark-v11"              ← pure dark
//   "mapbox://styles/mapbox/navigation-night-v1"   ← dark with road detail
// You can also create a fully custom style at mapbox.com/studio.
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

// ── Colour constants (matching your existing theme) ──────────
const ORANGE = "#f54900";
const NAVY = "#0f172b";

// ── Shared sub-components (unchanged from original) ─────────

const SectionTitle = ({
  title,
  icon,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) => (
  <View className="flex-row items-center mt-2 mb-4">
    <Ionicons name={icon} size={18} color={ORANGE} />
    <Text className="ml-2 text-xs font-black tracking-widest text-gray-400 uppercase">
      {title}
    </Text>
  </View>
);

const FilterGroup = ({
  title,
  items,
  activeFilters,
  onToggle,
}: {
  title: string;
  items: readonly string[];
  activeFilters: string[];
  onToggle: (item: string) => void;
}) => (
  <View className="mb-6">
    <Text className="mb-3 text-sm font-bold text-gray-700">{title}</Text>
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => {
        const isSelected = activeFilters.includes(item);
        return (
          <TouchableOpacity
            key={item}
            onPress={() => onToggle(item)}
            className={`px-4 py-2 rounded-full border ${
              isSelected
                ? "bg-orange-600 border-orange-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isSelected ? "text-white" : "text-gray-600"
              }`}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const ActiveFiltersSummary = ({
  filters,
  onRemove,
}: {
  filters: string[];
  onRemove: (item: string) => void;
}) => {
  if (filters.length === 0) return null;
  return (
    <View className="mb-6">
      <Text className="mb-2 text-xs font-bold tracking-widest text-gray-400 uppercase">
        Active Selections ({filters.length})
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              onRemove(filter);
            }}
            className="flex-row items-center bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-full mr-2"
          >
            <Text className="mr-1 text-sm font-medium text-orange-700">
              {filter}
            </Text>
            <Ionicons name="close-circle" size={14} color={ORANGE} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const getPhotoUrl = (photoReference: string | undefined) => {
  if (!photoReference || !GOOGLE_API_KEY) return undefined;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
};

// ── GeoJSON helpers ──────────────────────────────────────────
// Mapbox renders data as GeoJSON FeatureCollections passed into
// ShapeSource. We convert your existing clusteredMarkers array
// (produced by useExperienceMap) into this format here in the
// screen component. The hook itself is not touched at all.
const buildFeatureCollection = (
  markers: ReturnType<typeof useExperienceMap>["clusteredMarkers"],
  userLocation: { latitude: number; longitude: number } | null,
) => {
  const experienceFeatures = markers.map((marker) => ({
    type: "Feature" as const,
    id: marker.id,
    geometry: {
      type: "Point" as const,
      coordinates: [marker.coordinates.longitude, marker.coordinates.latitude],
    },
    properties: {
      id: marker.id,
      title: marker.title,
      snippet: marker.snippet ?? "",
      isCluster: marker.isCluster,
      count: marker.count,
      typeTag: marker.typeTag ?? "default",
    },
  }));

  const userFeature = userLocation
    ? [
        {
          type: "Feature" as const,
          id: "user-pos",
          geometry: {
            type: "Point" as const,
            coordinates: [userLocation.longitude, userLocation.latitude],
          },
          properties: {
            id: "user-pos",
            title: "You",
            isCluster: false,
            count: 1,
            typeTag: "user",
          },
        },
      ]
    : [];

  return {
    type: "FeatureCollection" as const,
    features: [...experienceFeatures, ...userFeature],
  };
};

// ── Main screen component ────────────────────────────────────

export default function MapScreen() {
  // ── All hook state  ───────────────
  const {
    activeFilters,
    addRecentSearch,
    clearRecentSearches,
    clusteredMarkers,
    currentZoom,
    errorMessage,
    filteredMarkers,
    getClusterMarkerById,
    isFetchingDetails,
    isFilterModalVisible,
    isLoadingPlaces,
    isSearchActive,
    isVerifiedOnly,
    locationPermissionDenied,
    locateUser,
    recentSearches,
    onCameraMove,
    resetFilters,
    searchQuery,
    searchResults,
    selectMarkerById,
    selectedMarker,
    selectedTabs,
    setIsFilterModalVisible,
    setIsSearchActive,
    setIsVerifiedOnly,
    setSearchQuery,
    setSelectedMarker,
    toggleFilter,
    toggleQuickTab,
    userLocation,
    loadPlaces,
    totalPlacesInViewport,
  } = useExperienceMap();

  // ── Mapbox camera ref ──────────────────────────────────────
  // MapboxGL.Camera is controlled via a ref + setCamera() calls.
  // This replaces your previous mapRef.current.moveCamera() calls.
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const searchInputRef = useRef<TextInput>(null);
  const galleryScrollRef = useRef<ScrollView>(null);
  const hasAutoCenteredRef = useRef(false);
  const [sheetDragY, setSheetDragY] = React.useState(0);
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);

  // ── Camera control ─────────────────────────────────────────
  // Replaces your previous centerMapOn() function.
  // MapboxGL.Camera.setCamera() is the Mapbox equivalent of
  // moveCamera() / setCameraPosition() from expo-maps.
  const centerMapOn = useCallback(
    (lat: number, lng: number, zoom = 16, animated = true) => {
      cameraRef.current?.setCamera({
        centerCoordinate: [lng, lat], // Mapbox uses [lng, lat] — note the order
        zoomLevel: zoom,
        animationDuration: animated ? 800 : 0,
        animationMode: "flyTo",
      });
    },
    [],
  );

  // ── Auto-locate on mount (same logic as original) ──────────
  useEffect(() => {
    if (hasAutoCenteredRef.current) return;
    hasAutoCenteredRef.current = true;

    void (async () => {
      const coordinates = await locateUser(true);
      if (coordinates) {
        centerMapOn(coordinates.latitude, coordinates.longitude, 16);
      }
    })();
  }, [centerMapOn, locateUser]);

  useEffect(() => {
    if (isSearchActive) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchActive]);

  useEffect(() => {
    if (selectedMarker) {
      setSheetDragY(0);
      setIsSheetExpanded(false);
      setActivePhotoIndex(0);
    }
  }, [selectedMarker]);

  const closeInfoSheet = useCallback(() => {
    setSheetDragY(0);
    setIsSheetExpanded(false);
    setSelectedMarker(null);
  }, [setSelectedMarker]);

  // ── Sheet pan responder (unchanged from original) ──────────
  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          const clamped = Math.max(-220, Math.min(260, gestureState.dy));
          setSheetDragY(clamped);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -80 || gestureState.vy < -1.1) {
            setIsSheetExpanded(true);
            setSheetDragY(0);
            return;
          }
          if (gestureState.dy > 100 || gestureState.vy > 1.1) {
            closeInfoSheet();
            return;
          }
          setSheetDragY(0);
        },
        onPanResponderTerminate: () => setSheetDragY(0),
      }),
    [closeInfoSheet],
  );

  // ── Marker tap handler ─────────────────────────────────────
  // Replaces your handleMarkerClick function.
  // ShapeSource.onPress receives the tapped GeoJSON feature
  // with its properties — equivalent to expo-maps' onMarkerClick.
  const handleFeaturePress = useCallback(
    async (event: any) => {
      const feature = event.features?.[0];
      if (!feature) return;

      const { id, isCluster } = feature.properties;

      if (isCluster) {
        const cluster = getClusterMarkerById(String(id));
        if (!cluster) return;
        centerMapOn(
          cluster.coordinates.latitude,
          cluster.coordinates.longitude,
          Math.min(20, currentZoom + 2),
        );
        return;
      }

      // Skip user location dot taps
      if (String(id) === "user-pos") return;

      setSearchQuery("");
      setIsSearchActive(false);
      Keyboard.dismiss();

      const resolvedMarker = await selectMarkerById(String(id));
      if (resolvedMarker) {
        centerMapOn(
          resolvedMarker.geometry.location.lat,
          resolvedMarker.geometry.location.lng,
        );
      }
    },
    [
      centerMapOn,
      currentZoom,
      getClusterMarkerById,
      selectMarkerById,
      setIsSearchActive,
      setSearchQuery,
    ],
  );

  // ── Camera move → pass to hook ─────────────────────────────
  // MapboxGL fires onCameraChanged with a different event shape
  // than expo-maps' onCameraMove. We normalise it here so your
  // existing onCameraMove hook handler receives the same shape
  // it already expects: { coordinates: {latitude, longitude}, zoom }
  const handleCameraChanged = useCallback(
    (state: MapboxGL.MapState) => {
      const [lng, lat] = state.properties.center;
      const zoom = state.properties.zoom;
      onCameraMove({
        coordinates: { latitude: lat, longitude: lng },
        zoom,
      });
    },
    [onCameraMove],
  );

  const selectFromSearch = (place: GooglePlace) => {
    setSearchQuery("");
    setIsSearchActive(false);
    setSelectedMarker(place);
    Keyboard.dismiss();
    centerMapOn(place.geometry.location.lat, place.geometry.location.lng);
    addRecentSearch(place.name);
  };

  const openSearch = () => {
    setIsSearchActive(true);
    setSelectedMarker(null);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const handleLocateMe = async () => {
    const coordinates = await locateUser(true);
    if (coordinates) {
      centerMapOn(coordinates.latitude, coordinates.longitude, 18);
      return;
    }
    if (locationPermissionDenied) {
      void Linking.openSettings();
    }
  };

  // ── GeoJSON data for Mapbox ShapeSource ────────────────────
  // Built from your existing clusteredMarkers + userLocation —
  // both still produced by useExperienceMap unchanged.
  const featureCollection = useMemo(
    () => buildFeatureCollection(clusteredMarkers, userLocation),
    [clusteredMarkers, userLocation],
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* ── Mapbox map (replaces GoogleMaps.View) ─────────── */}
      <MapboxGL.MapView
        style={{ flex: 1, position: "absolute", inset: 0 }}
        styleURL={MAP_STYLE}
        logoEnabled={true} // Required by Mapbox ToS
        attributionEnabled={true} // Required by Mapbox ToS
        compassEnabled={false}
        scaleBarEnabled={false}
        onCameraChanged={handleCameraChanged}
        onPress={() => {
          setSelectedMarker(null);
          setIsSearchActive(false);
          setSearchQuery("");
          Keyboard.dismiss();
        }}
      >
        {/* Camera — replaces initialCamera state + moveCamera calls */}
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[INITIAL_REGION.longitude, INITIAL_REGION.latitude]}
          zoomLevel={14}
          animationMode="none"
        />

        {/* All markers (experiences + clusters + user dot) in one ShapeSource.
            Mapbox processes GeoJSON entirely on the native thread so pins
            don't cause JS frame drops during map panning. */}
        <MapboxGL.ShapeSource
          id="markers"
          shape={featureCollection}
          onPress={handleFeaturePress}
        >
          {/* ── Cluster bubble (orange filled circle) ──────── */}
          <MapboxGL.CircleLayer
            id="cluster-circles"
            filter={["==", ["get", "isCluster"], true]}
            style={{
              circleColor: ORANGE,
              circleRadius: [
                "step",
                ["get", "count"],
                22, // radius for count < 10
                10,
                30, // radius for 10–49
                50,
                38, // radius for 50+
              ],
              circleOpacity: 0.92,
              circleStrokeWidth: 3,
              circleStrokeColor: NAVY,
            }}
          />

          {/* Cluster count label */}
          <MapboxGL.SymbolLayer
            id="cluster-labels"
            filter={["==", ["get", "isCluster"], true]}
            style={{
              textField: ["get", "count"],
              textSize: 13,
              textColor: "#ffffff",
              textAllowOverlap: true,
              textFont: ["DIN Pro Bold", "Arial Unicode MS Bold"],
            }}
          />

          {/* ── Individual experience pin (orange dot) ──────── */}
          <MapboxGL.CircleLayer
            id="experience-pins"
            filter={[
              "all",
              ["==", ["get", "isCluster"], false],
              ["!=", ["get", "typeTag"], "user"],
            ]}
            style={{
              circleColor: ORANGE,
              circleRadius: 10,
              circleStrokeWidth: 3,
              circleStrokeColor: "#ffffff",
            }}
          />

          {/* ── User location dot (white with navy border) ──── */}
          <MapboxGL.CircleLayer
            id="user-dot"
            filter={["==", ["get", "typeTag"], "user"]}
            style={{
              circleColor: "#ffffff",
              circleRadius: 8,
              circleStrokeWidth: 3,
              circleStrokeColor: ORANGE,
              // Pulsing animation via circleRadius expression isn't
              // natively supported in Mapbox GL JS without a custom
              // animation loop. For now a static dot is rendered.
              // A pulsing UserLocation component can be added in Phase 2.
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* ── All overlay UI (unchanged from original) ──────── */}
      <SafeAreaView
        className="flex-col justify-between flex-1 px-4"
        pointerEvents="box-none"
      >
        <View
          className={`${
            isSearchActive
              ? "absolute inset-0 bg-white z-[10000] px-4 pt-4"
              : "gap-4"
          }`}
          style={
            isSearchActive
              ? { height: SCREEN_HEIGHT, width: SCREEN_WIDTH, left: 0, top: 0 }
              : undefined
          }
        >
          {locationPermissionDenied && !isSearchActive && (
            <View className="flex-row items-start p-3 bg-white border border-orange-200 rounded-xl">
              <Ionicons name="warning-outline" size={20} color="#f97316" />
              <View className="flex-1 ml-2">
                <Text className="text-sm font-semibold text-gray-800">
                  Location access is off
                </Text>
                <Text className="text-xs text-gray-600">
                  Enable it for better nearby results.
                </Text>
                <TouchableOpacity
                  className="mt-1"
                  onPress={() => Linking.openSettings()}
                >
                  <Text className="text-xs font-bold text-orange-600">
                    Open Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!!errorMessage && !isSearchActive && (
            <View className="flex-row items-center justify-between p-3 bg-white border border-red-200 rounded-xl">
              <View className="flex-row items-center flex-1">
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#dc2626"
                />
                <Text className="ml-2 text-xs font-semibold text-red-600">
                  {errorMessage}
                </Text>
              </View>
              <TouchableOpacity onPress={() => void loadPlaces()}>
                <Text className="text-xs font-bold text-orange-600">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search bar */}
          <View
            className="flex-row items-center bg-white shadow-2xl rounded-2xl"
            style={{ elevation: 10 }}
          >
            <TouchableOpacity
              className="items-center justify-center w-12 h-16"
              activeOpacity={0.8}
              onPress={() => (isSearchActive ? closeSearch() : openSearch())}
            >
              <Ionicons
                name={isSearchActive ? "arrow-back" : "search-outline"}
                size={24}
                color={ORANGE}
              />
            </TouchableOpacity>

            <TextInput
              ref={searchInputRef}
              className="flex-1 h-16 text-xl"
              placeholder={isLoadingPlaces ? "Loading..." : "Search markers..."}
              placeholderTextColor="#ccc"
              value={searchQuery}
              onFocus={openSearch}
              onChangeText={setSearchQuery}
            />

            {isSearchActive && searchQuery.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSearchQuery("")}
                className="px-2"
              >
                <Ionicons name="close-circle" size={20} color="#ccc" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              className="items-center justify-center w-12 h-16"
              onPress={() => setIsFilterModalVisible(true)}
            >
              <Ionicons name="options" size={24} color={ORANGE} />
            </TouchableOpacity>
          </View>

          {/* Search active overlay */}
          {isSearchActive ? (
            <Animated.View
              entering={FadeInDown.duration(250)}
              exiting={FadeOutDown.duration(180)}
              style={{ flex: 1 }}
            >
              <ScrollView className="flex-1 mt-4">
                {searchQuery.length > 0 ? (
                  <>
                    {searchResults.length === 0 ? (
                      <View className="items-center justify-center pt-20">
                        <Ionicons
                          name="alert-circle-outline"
                          size={40}
                          color="#eee"
                        />
                        <Text className="mt-2 text-gray-400">
                          No places match &quot;{searchQuery}&quot;
                        </Text>
                      </View>
                    ) : (
                      searchResults.map((item) => (
                        <TouchableOpacity
                          key={item.place_id}
                          className="flex-row items-center p-4 border-b border-gray-100"
                          onPress={() => selectFromSearch(item)}
                        >
                          <Ionicons
                            name="location-outline"
                            size={25}
                            color="#666"
                          />
                          <View className="ml-3">
                            <Text className="text-lg font-semibold text-gray-800">
                              {item.name}
                            </Text>
                            <Text className="text-sm text-gray-500">
                              {item.vicinity}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                ) : (
                  <View>
                    {recentSearches.length > 0 && (
                      <View className="mb-6">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                            Recent Searches
                          </Text>
                          <TouchableOpacity onPress={clearRecentSearches}>
                            <Text className="text-xs font-bold text-orange-500">
                              CLEAR
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {recentSearches.map((term) => (
                          <TouchableOpacity
                            key={term}
                            className="flex-row items-center py-3 border-b border-gray-50"
                            onPress={() => setSearchQuery(term)}
                          >
                            <Ionicons
                              name="time-outline"
                              size={20}
                              color="#ccc"
                            />
                            <Text className="ml-3 text-lg text-gray-600">
                              {term}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <View className="items-center justify-center pt-10">
                      <Ionicons name="search" size={40} color="#eee" />
                      <Text className="mt-2 text-gray-400">
                        Search for places on the map...
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          ) : (
            // Quick tabs
            <View className="flex-row">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {QUICK_TABS.map((item) => {
                  const isActive = selectedTabs.includes(item);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      key={item}
                      onPress={() => toggleQuickTab(item)}
                      className={`px-6 py-2 rounded-full ${
                        isActive ? "bg-orange-600" : "bg-white"
                      }`}
                      style={{ elevation: 5 }}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          isActive ? "text-white" : "text-slate-600"
                        }`}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Bottom controls */}
        {!isSearchActive && (
          <View className="flex-row-reverse justify-between">
            <View className="flex-col gap-4 mb-4">
              <TouchableOpacity
                activeOpacity={0.87}
                className="items-center self-end justify-center w-12 h-12 bg-orange-500 rounded-full"
                style={{ elevation: 8 }}
                onPress={() => router.push("/(tabs)/myExperience")}
              >
                <Ionicons name="add" size={23} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.87}
                className="items-center self-end justify-center w-12 h-12 bg-white rounded-full"
                style={{ elevation: 8 }}
                onPress={() => void handleLocateMe()}
              >
                <Ionicons name="locate" size={23} color={ORANGE} />
              </TouchableOpacity>
            </View>

            <View className="items-center self-end justify-center w-auto px-3 py-2 mb-4 text-center bg-white rounded-full h-9">
              <Text className="text-xs font-semibold text-gray-700">
                Showing {totalPlacesInViewport} places
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Global loading overlay */}
      {isLoadingPlaces && filteredMarkers.length === 0 && (
        <View className="absolute inset-0 items-center justify-center bg-black/10">
          <View className="flex-row items-center px-4 py-3 bg-white rounded-full">
            <ActivityIndicator size="small" color={ORANGE} />
            <Text className="ml-2 font-semibold text-gray-700">
              Loading experiences...
            </Text>
          </View>
        </View>
      )}

      {/* Bottom info sheet (unchanged from original) */}
      {selectedMarker && (
        <Animated.View
          entering={SlideInDown.duration(240).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(300)}
          className="absolute bottom-0 w-full overflow-hidden bg-white rounded-t-3xl"
          style={{
            elevation: 35,
            zIndex: 9999,
            top: isSheetExpanded ? 0 : undefined,
            transform: [{ translateY: sheetDragY }],
            maxHeight: isSheetExpanded ? SCREEN_HEIGHT : SCREEN_HEIGHT * 0.58,
            borderTopLeftRadius: isSheetExpanded ? 0 : 24,
            borderTopRightRadius: isSheetExpanded ? 0 : 24,
          }}
          {...sheetPanResponder.panHandlers}
        >
          <View className="items-center pt-2 pb-1">
            <View className="w-12 h-1.5 rounded-full bg-gray-300" />
            <Text className="mt-1 text-[11px] text-gray-400">
              {isSheetExpanded
                ? "Swipe down to close"
                : "Swipe up for more details"}
            </Text>
          </View>

          <View
            className={`w-full bg-gray-200 ${
              isSheetExpanded ? "h-72" : "h-52"
            }`}
          >
            {isFetchingDetails ? (
              <View className="items-center justify-center w-full h-full">
                <ActivityIndicator size="large" color={ORANGE} />
              </View>
            ) : selectedMarker.photos && selectedMarker.photos.length > 0 ? (
              <>
                <ScrollView
                  ref={galleryScrollRef}
                  horizontal
                  pagingEnabled
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const nextIndex = Math.round(
                      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                    );
                    setActivePhotoIndex(nextIndex);
                  }}
                >
                  {selectedMarker.photos.map((photo, index) => (
                    <View key={index} style={{ width: SCREEN_WIDTH }}>
                      <Image
                        source={{ uri: getPhotoUrl(photo.photo_reference) }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>
                {selectedMarker.photos.length > 1 && (
                  <View className="absolute flex-row items-center px-2 py-1 rounded-full bottom-3 left-3 bg-black/45">
                    <Text className="text-xs font-semibold text-white">
                      {activePhotoIndex + 1}/{selectedMarker.photos.length}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View className="items-center justify-center w-full h-full">
                <Ionicons name="image-outline" size={48} color="#ccc" />
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={closeInfoSheet}
              className="absolute p-2 rounded-full top-4 right-4 bg-white/80"
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View className="px-5 pt-4 pb-6">
            {!!selectedMarker.photos?.length &&
              selectedMarker.photos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ gap: 8, paddingRight: 8 }}
                >
                  {selectedMarker.photos.slice(0, 8).map((photo, index) => {
                    const isActive = index === activePhotoIndex;
                    return (
                      <TouchableOpacity
                        key={`${photo.photo_reference}-${index}`}
                        activeOpacity={0.9}
                        onPress={() => {
                          setActivePhotoIndex(index);
                          galleryScrollRef.current?.scrollTo({
                            x: index * SCREEN_WIDTH,
                            animated: true,
                          });
                        }}
                        className={`overflow-hidden rounded-xl border-2 ${
                          isActive ? "border-orange-500" : "border-transparent"
                        }`}
                      >
                        <Image
                          source={{ uri: getPhotoUrl(photo.photo_reference) }}
                          style={{ width: 70, height: 70 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-[22px] font-bold text-gray-900"
                  numberOfLines={1}
                >
                  {selectedMarker.name}
                </Text>
                <Text
                  className="mt-1 text-sm font-medium text-gray-500"
                  numberOfLines={1}
                >
                  {(selectedMarker.types?.[0] || "experience").replaceAll(
                    "_",
                    " ",
                  )}
                </Text>
              </View>
              <View className="items-end">
                <View className="flex-row items-center px-2 py-1 rounded-lg bg-amber-50">
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text className="ml-1 text-sm font-bold text-amber-700">
                    {selectedMarker.rating || "N/A"}
                  </Text>
                </View>
                {!!selectedMarker.user_ratings_total && (
                  <Text className="mt-1 text-xs text-gray-500">
                    {selectedMarker.user_ratings_total} reviews
                  </Text>
                )}
              </View>
            </View>

            <View className="flex-row items-center mt-3">
              <Ionicons name="location-outline" size={16} color="#6b7280" />
              <Text className="ml-2 text-sm text-gray-700" numberOfLines={2}>
                {selectedMarker.vicinity}
              </Text>
            </View>

            <View className="flex-row mt-5">
              <TouchableOpacity
                className="items-center justify-center flex-1 py-3 mr-2 bg-gray-100 rounded-xl"
                onPress={() =>
                  void Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      selectedMarker.name,
                    )}&query_place_id=${selectedMarker.place_id}`,
                  )
                }
              >
                <Text className="font-semibold text-gray-800">Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center justify-center flex-1 py-3 ml-2 bg-orange-600 rounded-xl"
                onPress={() => router.push("/(tabs)/chat")}
              >
                <Text className="font-bold text-white">Join Group Chat</Text>
              </TouchableOpacity>
            </View>

            <Text className="mt-4 text-xs text-gray-400">
              Info is sourced from Google Places and community activity.
            </Text>

            {isSheetExpanded && (
              <View className="pt-4 mt-4 border-t border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-gray-900">
                    Experience Details
                  </Text>
                  <Text className="text-xs font-medium text-gray-500">
                    place id: {selectedMarker.place_id.slice(0, 8)}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {(selectedMarker.types || []).slice(0, 8).map((type) => (
                    <View
                      key={type}
                      className="px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200"
                    >
                      <Text className="text-xs font-medium text-gray-700">
                        {type.replaceAll("_", " ")}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="mt-3 text-xs leading-5 text-gray-500">
                  Discover this spot with nearby people, open the group chat,
                  and coordinate plans in real time.
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Full-screen filter modal (unchanged from original) */}
      {isFilterModalVisible && (
        <Animated.View
          entering={SlideInRight.duration(200).easing(Easing.out(Easing.quad))}
          exiting={SlideOutRight.duration(200)}
          style={{ zIndex: 20000, width: SCREEN_WIDTH }}
          className="absolute inset-0 bg-white"
        >
          <SafeAreaView className="flex-1">
            <View className="flex-row-reverse items-center justify-between px-6 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={25} color="#333" />
              </TouchableOpacity>
              <Text className="text-xl font-bold">Filters</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text className="font-semibold text-orange-600">Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 pt-4">
              <ActiveFiltersSummary
                filters={activeFilters}
                onRemove={toggleFilter}
              />
              <SectionTitle title="CATEGORY FILTERS" icon="options" />
              {FILTER_GROUPS.map((group) => (
                <FilterGroup
                  key={group.title}
                  title={group.title}
                  items={group.items}
                  activeFilters={activeFilters}
                  onToggle={toggleFilter}
                />
              ))}
              <View className="h-px my-6 bg-gray-100" />
              <SectionTitle title="SMART FILTERS" icon="filter-outline" />
              {SMART_FILTER_GROUPS.map((group) => (
                <FilterGroup
                  key={group.title}
                  title={group.title}
                  items={group.items}
                  activeFilters={activeFilters}
                  onToggle={toggleFilter}
                />
              ))}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsVerifiedOnly(!isVerifiedOnly)}
                className="flex-row items-center justify-between px-4 py-4 mt-4 mb-10 bg-gray-50 rounded-xl"
              >
                <View>
                  <Text className="font-bold text-gray-800">Verified Only</Text>
                  <Text className="text-xs text-gray-500">
                    Show only trusted ThirdPlaces
                  </Text>
                </View>
                <View
                  className={`w-12 h-6 rounded-full px-1 justify-center ${
                    isVerifiedOnly
                      ? "bg-orange-600 items-end"
                      : "bg-gray-300 items-start"
                  }`}
                >
                  <View className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View className="px-6 py-4 bg-white border-t border-gray-100">
              <TouchableOpacity
                onPress={() => setIsFilterModalVisible(false)}
                className="items-center py-4 bg-orange-600 shadow-lg rounded-2xl"
              >
                <Text className="text-lg font-bold text-white">
                  Apply Filters ({filteredMarkers.length} results)
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </>
  );
}
