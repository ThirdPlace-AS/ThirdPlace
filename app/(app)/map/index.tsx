// ─────────────────────────────────────────────────────────────
// app/(app)/map/index.tsx
// Map screen — pure JSX. All logic lives in hooks.
// Layout:
//   • SearchBar  — top, absolute, zIndex 20
//   • MapboxGL   — full screen base layer
//   • FAB stack  — bottom-right: [create ✨] [locate 📍]
//   • VenueBottomSheet — slides up on OSM pin tap
// ─────────────────────────────────────────────────────────────
import { SearchBar } from "@/components/map/SearchBar";
import { VenueBottomSheet } from "@/components/map/VenueBottomSheet";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useExperiences } from "@/hooks/useExperiences";
import { useFriendLocations } from "@/hooks/useFriendLocation";
import { OSLO_DEFAULT, useLocation } from "@/hooks/useLocation";
import { useOSMPlaces } from "@/hooks/useOSMPlaces";
import { useSearch } from "@/hooks/useSearch";
import { useVenueSheet } from "@/hooks/useVenueSheet";
import { CAMERA_DEBOUNCE_MS, COLOURS, MAP_CONFIG } from "@/lib/constants";
import type { FriendLocation, OSMPlace } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import MapboxGL, { type ImageEntry } from "@rnmapbox/maps";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) MapboxGL.setAccessToken(MAPBOX_TOKEN);

// Emoji image map for MapboxGL.Images — registered once, stable reference
// Mapbox symbols can only reference images registered as a sprite.
// Using bundled PNGs is the most reliable approach (no native bitmap-capture
// of React elements, which can crash on some devices).
const MAPBOX_IMAGES: Record<string, ImageEntry> = {
  // Venue markers (type-specific)
  "venue-amusement_park": require("../../../assets/markers/amusement_park.png"),
  "venue-aquarium": require("../../../assets/markers/aquarium.png"),
  "venue-art_gallery": require("../../../assets/markers/art_gallery.png"),
  "venue-bakery": require("../../../assets/markers/bakery.png"),
  "venue-bar": require("../../../assets/markers/bar.png"),
  "venue-bowling_alley": require("../../../assets/markers/bowling_alley.png"),
  "venue-cafe": require("../../../assets/markers/cafe.png"),
  "venue-campground": require("../../../assets/markers/campground.png"),
  "venue-coworking_space": require("../../../assets/markers/coworking_space.png"),
  "venue-gym": require("../../../assets/markers/gym.png"),
  "venue-hiking_area": require("../../../assets/markers/hiking_area.png"),
  "venue-library": require("../../../assets/markers/library.png"),
  "venue-market": require("../../../assets/markers/market.png"),
  "venue-meal_takeaway": require("../../../assets/markers/meal_takeaway.png"),
  "venue-movie_theater": require("../../../assets/markers/movie_theater.png"),
  "venue-museum": require("../../../assets/markers/museum.png"),
  "venue-park": require("../../../assets/markers/park.png"),
  "venue-performing_arts_theater": require("../../../assets/markers/performing_arts_theater.png"),
  "venue-restaurant": require("../../../assets/markers/restaurant.png"),
  "venue-shopping_mall": require("../../../assets/markers/shopping_mall.png"),
  "venue-spa": require("../../../assets/markers/spa.png"),
  "venue-tourist_attraction": require("../../../assets/markers/tourist_attraction.png"),
  "venue-zoo": require("../../../assets/markers/zoo.png"),

  // Fallback for unknown/unsupported place types
  "venue-default": require("../../../assets/markers/default.png"),
};

const VENUE_ICON_KEYS = new Set(Object.keys(MAPBOX_IMAGES));

function toVenueIconKey(placeType: string): string {
  const key = `venue-${placeType}`;
  return VENUE_ICON_KEYS.has(key) ? key : "venue-default";
}

export default function MapScreen() {
  const { coords, permissionDenied, requestLocation } = useLocation();
  const { experiences, isLoading, error, fetchNearby } = useExperiences();
  const { osmPlaces, fetchNearby: fetchOSM } = useOSMPlaces();
  const [shareLocation, setShareLocation] = useState(false);
  const { friends } = useFriendLocations(shareLocation);
  const venueSheet = useVenueSheet();
  const search = useSearch(coords);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mount: get GPS → initial fetch ───────────────────────────
  // Without a token, Mapbox will fail to load and can crash on some builds.
  // Return early with a clear message instead of rendering <MapView />.
  if (!MAPBOX_TOKEN) {
    return (
      <ErrorFallback message="Mapbox token is missing. Set EXPO_PUBLIC_MAPBOX_TOKEN in .env and restart the app." />
    );
  }

  useEffect(() => {
    (async () => {
      const loc = (await requestLocation()) ?? OSLO_DEFAULT;
      await Promise.all([
        fetchNearby(loc.longitude, loc.latitude, true),
        fetchOSM(loc.longitude, loc.latitude, true),
      ]);
      cameraRef.current?.setCamera({
        centerCoordinate: [loc.longitude, loc.latitude],
        zoomLevel: MAP_CONFIG.DEFAULT_ZOOM,
        animationDuration: 800,
      });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fly to coordinates (used by search result tap) ────────────
  const flyTo = useCallback((lng: number, lat: number) => {
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 15,
      animationDuration: 600,
    });
  }, []);

  // ── Locate me FAB ─────────────────────────────────────────────
  const handleLocateMe = useCallback(async () => {
    const loc = (await requestLocation()) ?? OSLO_DEFAULT;
    cameraRef.current?.setCamera({
      centerCoordinate: [loc.longitude, loc.latitude],
      zoomLevel: MAP_CONFIG.DEFAULT_ZOOM,
      animationDuration: 500,
    });
  }, [requestLocation]);

  // ── GeoJSON ───────────────────────────────────────────────────
  const experiencesGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: experiences.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [e.longitude, e.latitude] },
      properties: {
        id: e.id,
        title: e.title,
        category: e.category,
        count: e.participant_count,
      },
    })),
  };

  const osmGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: osmPlaces.map((p: OSMPlace) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: {
        venueJson: JSON.stringify(p),
        place_type: p.place_type,
        name: p.name,
        iconKey: toVenueIconKey(p.place_type),
      },
    })),
  };

  const friendsGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: friends.map((f: FriendLocation) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
      properties: { name: f.profile.display_name },
    })),
  };

  // ── Debounced re-fetch on camera move ─────────────────────────
  const handleCameraChanged = (state: any) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const center = state?.properties?.center;
      const lng = center?.[0] ?? MAP_CONFIG.DEFAULT_LNG;
      const lat = center?.[1] ?? MAP_CONFIG.DEFAULT_LAT;
      void fetchNearby(lng, lat);
      void fetchOSM(lng, lat);
    }, CAMERA_DEBOUNCE_MS);
  };

  if (permissionDenied && experiences.length === 0) {
    return (
      <ErrorFallback
        message="Location permission denied. Showing Oslo by default."
        onRetry={requestLocation}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Map ─────────────────────────────────────────────── */}
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={MAP_CONFIG.MAP_STYLE}
        onCameraChanged={handleCameraChanged}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[MAP_CONFIG.DEFAULT_LNG, MAP_CONFIG.DEFAULT_LAT]}
          zoomLevel={MAP_CONFIG.DEFAULT_ZOOM}
        />

        {/* Emoji bitmap registration */}
        <MapboxGL.Images images={MAPBOX_IMAGES} />

        <MapboxGL.UserLocation visible animated />

        {/* OSM emoji pins */}
        <MapboxGL.ShapeSource
          id="osm-places"
          shape={osmGeoJSON}
          onPress={(e: any) => {
            if (search.isActive) return; // don't open sheet while searching
            const feature = e.features?.[0];
            if (!feature) return;
            try {
              const venue: OSMPlace = JSON.parse(
                feature.properties?.venueJson ?? "{}",
              );
              if (venue.name) venueSheet.openVenueSheet(venue);
            } catch {
              /* ignore */
            }
          }}
        >
          <MapboxGL.SymbolLayer
            id="osm-emoji-pins"
            style={{
              iconImage: ["get", "iconKey"],
              iconSize: 0.9,
              iconAllowOverlap: false,
              iconIgnorePlacement: false,
              iconOpacity: ["interpolate", ["linear"], ["zoom"], 12, 0, 13, 1],
              textField: ["get", "name"],
              textSize: 11,
              textColor: COLOURS.textSecondary,
              textOffset: [0, 1.4],
              textAnchor: "top",
              textOptional: true,
              textAllowOverlap: false,
              textOpacity: ["interpolate", ["linear"], ["zoom"], 14, 0, 15, 1],
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ThirdPlace experience pins */}
        <MapboxGL.ShapeSource
          id="experiences"
          shape={experiencesGeoJSON}
          cluster
          clusterRadius={50}
          clusterMaxZoomLevel={MAP_CONFIG.CLUSTER_ZOOM}
          onPress={(e: any) => {
            const id = e.features?.[0]?.properties?.id;
            if (id)
              router.push({
                pathname: "/(app)/map/[experienceId]",
                params: { experienceId: id },
              });
          }}
        >
          <MapboxGL.CircleLayer
            id="experience-circles"
            filter={["!", ["has", "point_count"]]}
            style={{
              circleRadius: 12,
              circleColor: COLOURS.accent,
              circleStrokeWidth: 2.5,
              circleStrokeColor: COLOURS.white,
            }}
          />
          <MapboxGL.CircleLayer
            id="cluster-circles"
            filter={["has", "point_count"]}
            style={{
              circleRadius: ["step", ["get", "point_count"], 18, 5, 24, 10, 30],
              circleColor: COLOURS.accentDark,
              circleOpacity: 0.92,
            }}
          />
          <MapboxGL.SymbolLayer
            id="cluster-count"
            filter={["has", "point_count"]}
            style={{
              textField: ["get", "point_count_abbreviated"],
              textColor: COLOURS.white,
              textSize: 13,
              textAllowOverlap: true,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* Friend dots */}
        {friends.length > 0 && (
          <MapboxGL.ShapeSource id="friends" shape={friendsGeoJSON}>
            <MapboxGL.CircleLayer
              id="friend-circles"
              style={{
                circleRadius: 10,
                circleColor: COLOURS.success,
                circleStrokeWidth: 2.5,
                circleStrokeColor: COLOURS.white,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* ── Search bar — top overlay ─────────────────────────── */}
      <SearchBar
        query={search.query}
        sections={search.sections}
        recentSearches={search.recentSearches}
        isLoading={search.isLoading}
        isActive={search.isActive}
        error={search.error}
        onChangeQuery={search.setQuery}
        onActivate={search.activate}
        onDeactivate={search.deactivate}
        onSelectRecent={search.selectRecent}
        onRemoveRecent={search.removeRecent}
        onClearQuery={search.clearQuery}
        onFlyTo={flyTo}
      />

      {/* ── Loading indicator ────────────────────────────────── */}
      {isLoading && !search.isActive && (
        <View
          style={{
            position: "absolute",
            top: 76,
            alignSelf: "center",
            backgroundColor: COLOURS.white,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <ActivityIndicator size="small" color={COLOURS.accent} />
          <Text style={{ fontSize: 13, color: COLOURS.textSecondary }}>
            Loading…
          </Text>
        </View>
      )}

      {/* ── Error banner ─────────────────────────────────────── */}
      {!!error && !search.isActive && (
        <SafeAreaView
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
          edges={["top"]}
        >
          <View
            style={{
              margin: 12,
              marginTop: 72,
              backgroundColor: COLOURS.errorLight,
              borderRadius: 12,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="alert-circle" size={16} color={COLOURS.error} />
            <Text style={{ fontSize: 13, color: COLOURS.error, flex: 1 }}>
              {error}
            </Text>
          </View>
        </SafeAreaView>
      )}

      {/* ── FAB stack — bottom right ─────────────────────────── */}
      {/* Hidden while search is active so they don't cover results */}
      {!search.isActive && (
        <View
          style={{
            position: "absolute",
            bottom: 110, // above tab bar
            right: 16,
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* Create experience FAB */}
          <TouchableOpacity
            onPress={() => router.push("/(app)/create")}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: COLOURS.accent,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: COLOURS.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Ionicons name="add" size={26} color={COLOURS.white} />
          </TouchableOpacity>

          {/* Locate me FAB */}
          <TouchableOpacity
            onPress={handleLocateMe}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: COLOURS.white,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="navigate" size={22} color={COLOURS.accent} />
          </TouchableOpacity>

          {/* Share location toggle */}
          <TouchableOpacity
            onPress={() => setShareLocation((p) => !p)}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: shareLocation ? COLOURS.success : COLOURS.white,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons
              name={shareLocation ? "people" : "people-outline"}
              size={20}
              color={shareLocation ? COLOURS.white : COLOURS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Venue bottom sheet ───────────────────────────────── */}
      <VenueBottomSheet
        venue={venueSheet.venue}
        visible={venueSheet.sheetState === "open"}
        isPromoting={venueSheet.isPromoting}
        error={venueSheet.promoteError}
        onDismiss={venueSheet.closeVenueSheet}
        onStart={venueSheet.startExperience}
      />
    </View>
  );
}
