// ─────────────────────────────────────────────────────────────
// lib/geo.ts
// Pure geographic utility functions — no imports, no side effects.
// Every function is independently testable.
// ─────────────────────────────────────────────────────────────
import type { CameraState, Coordinates, MapBounds } from "@/types";
import { Dimensions } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Degrees → radians
export const toRadians = (deg: number): number => (deg * Math.PI) / 180;

// ── Haversine distance ────────────────────────────────────────
// Returns real-world distance in metres between two lat/lng pairs.
// Used to decide whether the user has moved far enough to trigger
// a new Supabase fetch (threshold: 1 km).
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6_371_000; // Earth radius in metres
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Metres per pixel ──────────────────────────────────────────
// Used to convert a Mapbox camera state into real-world map bounds.
// Formula: Web Mercator projection at the given zoom level.
export function metresPerPixel(lat: number, zoom: number): number {
  return (156_543.03392 * Math.cos(toRadians(lat))) / 2 ** zoom;
}

// ── Camera → MapBounds ────────────────────────────────────────
// Derives the visible map rectangle from the camera position and zoom.
// Used to filter which markers are currently on screen before clustering.
export function boundsFromCamera(camera: CameraState): MapBounds {
  const mpp         = metresPerPixel(camera.latitude, camera.zoom);
  const widthM      = SCREEN_W * mpp;
  const heightM     = SCREEN_H * mpp;
  const latDelta    = heightM / 111_320;
  const lngDelta    = widthM / Math.max(1, 111_320 * Math.cos(toRadians(camera.latitude)));
  return {
    north: camera.latitude  + latDelta / 2,
    south: camera.latitude  - latDelta / 2,
    east:  camera.longitude + lngDelta / 2,
    west:  camera.longitude - lngDelta / 2,
  };
}

// ── Point-in-bounds check ─────────────────────────────────────
export function isInsideBounds(
  lat: number,
  lng: number,
  bounds: MapBounds,
): boolean {
  return (
    lat >= bounds.south && lat <= bounds.north &&
    lng >= bounds.west  && lng <= bounds.east
  );
}

// ── OSM bbox padding ──────────────────────────────────────────
// Builds a bounding box around a coordinate with a fixed degree padding.
// Sent to the OSM Edge Function to determine the cache area.
export function buildOSMBbox(
  coords: Coordinates,
  paddingDeg = 0.05,
): { south: number; west: number; north: number; east: number } {
  return {
    south: coords.latitude  - paddingDeg,
    west:  coords.longitude - paddingDeg,
    north: coords.latitude  + paddingDeg,
    east:  coords.longitude + paddingDeg,
  };
}

// ── PostGIS POINT string ──────────────────────────────────────
// Longitude FIRST — this is the most common PostGIS mistake.
// Always use this helper rather than interpolating manually.
export function toPostGISPoint(longitude: number, latitude: number): string {
  return `POINT(${longitude} ${latitude})`;
}

// ── Parse PostGIS POINT string ────────────────────────────────
// Converts "POINT(10.7522 59.9139)" → { longitude, latitude }
export function parsePostGISPoint(point: string): Coordinates | null {
  const match = point.match(/POINT\(([^ ]+) ([^ )]+)\)/);
  if (!match) return null;
  return {
    longitude: parseFloat(match[1]),
    latitude:  parseFloat(match[2]),
  };
}