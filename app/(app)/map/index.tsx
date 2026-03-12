// ─────────────────────────────────────────────────────────────
// app/(app)/map/index.tsx
// Map screen — pure JSX. Every data operation is via hooks.
// ─────────────────────────────────────────────────────────────
import { Ionicons } from "@expo/vector-icons";
import MapboxGL from "@rnmapbox/maps";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useFriendLocations } from "@/hooks/useFriendLocation";
import { useExperiences } from "@/hooks/useExperiences";
import { OSLO_DEFAULT, useLocation } from "@/hooks/useLocation";
import { CAMERA_DEBOUNCE_MS, COLOURS, MAP_CONFIG } from "@/lib/constants";
import type { FriendLocation } from "@/types";

// NOTE: useExperiences is exported from hooks/useLocation.ts
// (both hooks are defined in that file). Import path is correct.

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);

export default function MapScreen() {
  const { coords, permissionDenied, requestLocation } = useLocation();
  const { experiences, isLoading, error, fetchNearby, join } = useExperiences();
  const [shareLocation, setShareLocation] = useState(false);
  const { friends } = useFriendLocations(shareLocation);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request location and do the initial experiences fetch
  useEffect(() => {
    (async () => {
      const loc = (await requestLocation()) ?? OSLO_DEFAULT;
      await fetchNearby(loc.longitude, loc.latitude, true);
      cameraRef.current?.setCamera({
        centerCoordinate: [loc.longitude, loc.latitude],
        zoomLevel: MAP_CONFIG.DEFAULT_ZOOM,
        animationDuration: 800,
      });
    })();
  }, []);

  // GeoJSON sources
  const experiencesGeoJSON = {
    type: "FeatureCollection" as const,
    features: experiences.map((e) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [e.longitude, e.latitude],
      },
      properties: {
        id: e.id,
        title: e.title,
        category: e.category,
        count: e.participant_count,
      },
    })),
  };

  const friendsGeoJSON = {
    type: "FeatureCollection" as const,
    features: friends.map((f: FriendLocation) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [f.longitude, f.latitude],
      },
      properties: { name: f.profile.display_name },
    })),
  };

  // Debounced re-fetch on camera move
  const handleCameraChanged = (state: any) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const { lng, lat } = state?.properties?.center
        ? { lng: state.properties.center[0], lat: state.properties.center[1] }
        : { lng: MAP_CONFIG.DEFAULT_LNG, lat: MAP_CONFIG.DEFAULT_LAT };
      void fetchNearby(lng, lat);
    }, CAMERA_DEBOUNCE_MS);
  };

  if (permissionDenied && experiences.length === 0) {
    return (
      <ErrorFallback
        message="Location permission denied. Showing Oslo by default. Enable location in Settings for a personalised map."
        onRetry={requestLocation}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
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

        {/* User location dot */}
        <MapboxGL.UserLocation visible animated />

        {/* Experience pins */}
        <MapboxGL.ShapeSource
          id="experiences"
          shape={experiencesGeoJSON}
          cluster
          clusterRadius={50}
          clusterMaxZoomLevel={MAP_CONFIG.CLUSTER_ZOOM}
          onPress={(e: any) => {
            const feature = e.features[0];
            const id = feature?.properties?.id;
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
              circleRadius: 10,
              circleColor: COLOURS.mapPin,
              circleStrokeWidth: 2.5,
              circleStrokeColor: COLOURS.white,
            }}
          />
          <MapboxGL.CircleLayer
            id="cluster-circles"
            filter={["has", "point_count"]}
            style={{
              circleRadius: ["step", ["get", "point_count"], 18, 5, 24, 10, 30],
              circleColor: COLOURS.mapCluster,
              circleOpacity: 0.9,
            }}
          />
          <MapboxGL.SymbolLayer
            id="cluster-count"
            filter={["has", "point_count"]}
            style={{
              textField: ["get", "point_count_abbreviated"],
              textColor: COLOURS.white,
              textSize: 13,
              textFont: ["DIN Offc Pro Bold"],
              textAllowOverlap: true,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* Friend location dots */}
        <MapboxGL.ShapeSource id="friends" shape={friendsGeoJSON}>
          <MapboxGL.CircleLayer
            id="friend-circles"
            style={{
              circleRadius: 10,
              circleColor: COLOURS.mapFriend,
              circleStrokeWidth: 2.5,
              circleStrokeColor: COLOURS.white,
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* Loading indicator */}
      {isLoading && (
        <View
          style={{
            position: "absolute",
            top: 60,
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

      {/* Error banner */}
      {error && (
        <SafeAreaView
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
          edges={["top"]}
        >
          <View
            style={{
              margin: 12,
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

      {/* Share location FAB */}
      <TouchableOpacity
        onPress={() => setShareLocation((p) => !p)}
        style={{
          position: "absolute",
          bottom: 120,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: shareLocation ? COLOURS.success : COLOURS.white,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Ionicons
          name={shareLocation ? "navigate" : "navigate-outline"}
          size={22}
          color={shareLocation ? COLOURS.white : COLOURS.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}
