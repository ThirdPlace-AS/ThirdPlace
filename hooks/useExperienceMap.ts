import { CATEGORY_MAP } from "@/constants/experienceFilters";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoLocation from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions } from "react-native";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export const INITIAL_REGION = {
  latitude: 59.9138,
  longitude: 10.7387,
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Persisted key for search history.
const RECENTS_STORAGE_KEY = "@recent_searches";
// Persisted key for viewport tile cache to reduce Google API cost.
const TILE_CACHE_STORAGE_KEY = "@map_tile_cache_v1";
const MAX_RECENTS = 12;
// Google Nearby Search exposes up to 3 pages (roughly 60 results) per query point.
const MAX_GOOGLE_PAGES = 3;
// Hard cap to avoid flooding UI and API usage.
const MAX_TOTAL_MARKERS = 1000;
const MAX_QUERY_POINTS = 18;
const QUERY_RADIUS_METERS = 4500;
const QUERY_STEP_METERS = 6000;
const CACHE_MAX_ENTRIES = 140;
// Debounce camera movement so we refetch only when user pauses panning.
const CAMERA_DEBOUNCE_MS = 450;
// Keep cached tiles for up to 30 days.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Use fewer query points during camera moves for faster response.
const MOVE_QUERY_POINTS = 8;
const MOVE_BATCH_SIZE = 6;
const FULL_BATCH_SIZE = 4;
const INITIAL_QUERY_POINTS = 10;
const MANUAL_QUERY_POINTS = 12;
const ENRICH_QUERY_POINTS = 12;
const HTTP_TIMEOUT_MS = 12000;
const LOADING_FAILSAFE_MS = 20000;

// Allowlist of place types that are considered experience-based.
export const ALLOWED_EXPERIENCE_TYPES = new Set([
  // Food & Social
  "restaurant",
  "cafe",
  "bar",
  "bakery",
  "meal_takeaway",
  // Nature & Outdoor
  "park",
  "tourist_attraction",
  "campground",
  "hiking_area",
  "zoo",
  "aquarium",
  // Culture
  "museum",
  "art_gallery",
  "movie_theater",
  "performing_arts_theater",
  // Activities
  "gym",
  "bowling_alley",
  "amusement_park",
  "spa",
  // Shopping Experiences
  "shopping_mall",
  "market",
  // Study / Chill
  "library",
  "coworking_space",
]);

// Hard exclusion list for non-experience business categories.
const EXCLUDED_PLACE_TYPES = new Set([
  "accounting",
  "atm",
  "bank",
  "car_dealer",
  "car_rental",
  "car_repair",
  "courthouse",
  "doctor",
  "embassy",
  "finance",
  "fire_station",
  "funeral_home",
  "gas_station",
  "hospital",
  "insurance_agency",
  "lodging",
  "pharmacy",
  "police",
  "post_office",
  "real_estate_agency",
  "storage",
  "veterinary_care",
]);

export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  business_status?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
  icon?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  photos?: {
    photo_reference: string;
    height: number;
    width: number;
  }[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

type CameraState = {
  latitude: number;
  longitude: number;
  zoom: number;
};

type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type ClusterMapMarker = {
  id: string;
  title: string;
  snippet?: string;
  count: number;
  isCluster: boolean;
  typeTag?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

type TileCacheEntry = {
  timestamp: number;
  places: GooglePlace[];
  isComplete?: boolean;
};

// Convert degrees to radians for trigonometric calculations.
const toRadians = (value: number) => (value * Math.PI) / 180;

// Estimate meter-to-pixel ratio at a latitude/zoom level.
const metersPerPixel = (latitude: number, zoom: number) => {
  return (156543.03392 * Math.cos(toRadians(latitude))) / Math.pow(2, zoom);
};

// Derive visible map bounds from camera center + zoom.
const computeBoundsFromCamera = (camera: CameraState): MapBounds => {
  const mpp = metersPerPixel(camera.latitude, camera.zoom);
  const widthMeters = SCREEN_WIDTH * mpp;
  const heightMeters = SCREEN_HEIGHT * mpp;

  const latDelta = heightMeters / 111320;
  const lngDenominator = 111320 * Math.cos(toRadians(camera.latitude));
  const lngDelta = widthMeters / Math.max(1, lngDenominator);

  return {
    north: camera.latitude + latDelta / 2,
    south: camera.latitude - latDelta / 2,
    east: camera.longitude + lngDelta / 2,
    west: camera.longitude - lngDelta / 2,
  };
};

// Check whether a coordinate belongs to the currently visible viewport bounds.
const isInsideBounds = (lat: number, lng: number, bounds: MapBounds) => {
  if (lat < bounds.south || lat > bounds.north) return false;
  return lng >= bounds.west && lng <= bounds.east;
};

// Build a stable cache key from rounded coordinates + query radius.
const buildTileKey = (latitude: number, longitude: number) => {
  return `${latitude.toFixed(2)}:${longitude.toFixed(2)}:${QUERY_RADIUS_METERS}`;
};

// Keep only most-recent cache entries to control memory/storage growth.
const compactCache = (cache: Record<string, TileCacheEntry>) => {
  const entries = Object.entries(cache).sort(
    (a, b) => b[1].timestamp - a[1].timestamp,
  );
  return Object.fromEntries(entries.slice(0, CACHE_MAX_ENTRIES));
};

// Create Google Nearby Search URL for a query point.
const buildNearbySearchUrl = (latitude: number, longitude: number) => {
  return `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${QUERY_RADIUS_METERS}&type=point_of_interest&key=${GOOGLE_API_KEY}`;
};

// Decide whether a Google Place is valid for ThirdPlace experience discovery.
const isExperiencePlace = (place: GooglePlace) => {
  if (!place.name?.trim()) return false;
  if (place.business_status && place.business_status !== "OPERATIONAL")
    return false;

  const types = place.types || [];
  const hasAllowedType = types.some((type) =>
    ALLOWED_EXPERIENCE_TYPES.has(type),
  );
  const hasExcludedType = types.some((type) => EXCLUDED_PLACE_TYPES.has(type));
  return hasAllowedType && !hasExcludedType;
};

// Build a stable uniqueness key so each marker is one unique experience.
const buildExperienceKey = (place: GooglePlace) => {
  if (place.place_id) return place.place_id;
  const lat = place.geometry.location.lat.toFixed(5);
  const lng = place.geometry.location.lng.toFixed(5);
  return `${place.name.trim().toLowerCase()}:${lat}:${lng}`;
};

const getPrimaryExperienceType = (types: string[] | undefined) => {
  const list = types || [];
  return list.find((type) => ALLOWED_EXPERIENCE_TYPES.has(type));
};

const normalizePlacesForViewport = (
  places: GooglePlace[],
  bounds: MapBounds,
): GooglePlace[] => {
  const mergedById = new Map<string, GooglePlace>();
  for (const place of places) {
    if (!isExperiencePlace(place)) continue;
    const latitude = place.geometry.location.lat;
    const longitude = place.geometry.location.lng;
    if (!isInsideBounds(latitude, longitude, bounds)) continue;

    mergedById.set(buildExperienceKey(place), place);
    if (mergedById.size >= MAX_TOTAL_MARKERS) break;
  }
  return Array.from(mergedById.values()).slice(0, MAX_TOTAL_MARKERS);
};

// Wrap fetch with Google-specific API error handling.
const fetchJson = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/aborted|abort|timed out/i.test(message)) {
      throw new Error("Google Places request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Network error: ${response.status}`);
  }

  const payload = await response.json();
  if (
    payload.status &&
    payload.status !== "OK" &&
    payload.status !== "ZERO_RESULTS"
  ) {
    throw new Error(
      payload.error_message || `Google Places error: ${payload.status}`,
    );
  }

  return payload;
};

// Follow next_page_token chain and merge pages into one list.
const fetchAllPlacesPages = async (
  url: string,
  page = 1,
  accumulated: GooglePlace[] = [],
): Promise<GooglePlace[]> => {
  const payload = await fetchJson(url);
  const current: GooglePlace[] = payload.results || [];
  const merged = [...accumulated, ...current];

  if (payload.next_page_token && page < MAX_GOOGLE_PAGES) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const nextUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${payload.next_page_token}&key=${GOOGLE_API_KEY}`;
    return fetchAllPlacesPages(nextUrl, page + 1, merged);
  }

  return merged;
};

// Sample multiple query points over the visible viewport so large areas are covered.
const generateViewportQueryPoints = (
  bounds: MapBounds,
): { latitude: number; longitude: number }[] => {
  const centerLat = (bounds.north + bounds.south) / 2;
  const latStep = QUERY_STEP_METERS / 111320;
  const lngStep =
    QUERY_STEP_METERS / Math.max(1, 111320 * Math.cos(toRadians(centerLat)));

  const points: { latitude: number; longitude: number }[] = [];
  for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
    for (let lng = bounds.west; lng <= bounds.east; lng += lngStep) {
      points.push({ latitude: lat, longitude: lng });
    }
  }

  points.push({
    latitude: centerLat,
    longitude: (bounds.east + bounds.west) / 2,
  });

  if (points.length <= MAX_QUERY_POINTS) {
    return points;
  }

  const stride = Math.ceil(points.length / MAX_QUERY_POINTS);
  const sampled = points.filter((_, index) => index % stride === 0);
  return sampled.slice(0, MAX_QUERY_POINTS);
};

// Avoid expensive refetches for tiny camera movements or insignificant zoom changes.
const shouldRefetchForCamera = (
  current: CameraState,
  last: CameraState | null,
  lastBounds: MapBounds | null,
) => {
  if (!last || !lastBounds) return true;

  const zoomDelta = Math.abs(current.zoom - last.zoom);
  if (zoomDelta >= 0.6) return true;

  const centerStillInsidePrevious =
    current.latitude >= lastBounds.south &&
    current.latitude <= lastBounds.north &&
    current.longitude >= lastBounds.west &&
    current.longitude <= lastBounds.east;

  return !centerStillInsidePrevious;
};

// Extract a county-like label from place vicinity text.
const getCountyLabel = (place: GooglePlace) => {
  const text = place.vicinity?.trim() || "";
  if (!text) return "Unknown County";

  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "Unknown County";

  // Heuristic: last comma-separated part is often city/county-like area.
  const label = parts[parts.length - 1].replace(/^\d{3,6}\s+/, "");
  return label || "Unknown County";
};

// Group nearby markers into clusters when zoomed out.
const clusterPlaces = (
  places: GooglePlace[],
  _bounds: MapBounds,
  zoom: number,
): ClusterMapMarker[] => {
  if (places.length === 0) return [];

  // Only cluster when user is zoomed out extremely far.
  // At most zoom levels, render all markers individually.
  if (zoom > 8) {
    return places.map((place) => ({
      id: String(place.place_id),
      title: place.name,
      snippet: place.vicinity,
      count: 1,
      isCluster: false,
      typeTag: getPrimaryExperienceType(place.types),
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
    }));
  }

  // County-based buckets instead of grid-based buckets.
  const buckets = new Map<string, GooglePlace[]>();
  for (const place of places) {
    const key = getCountyLabel(place);
    const list = buckets.get(key) || [];
    list.push(place);
    buckets.set(key, list);
  }

  const clustered: ClusterMapMarker[] = [];
  let clusterIndex = 0;
  for (const [county, bucket] of buckets.entries()) {
    if (bucket.length === 1) {
      const only = bucket[0];
      clustered.push({
        id: String(only.place_id),
        title: only.name,
        snippet: only.vicinity,
        count: 1,
        isCluster: false,
        typeTag: getPrimaryExperienceType(only.types),
        coordinates: {
          latitude: only.geometry.location.lat,
          longitude: only.geometry.location.lng,
        },
      });
      continue;
    }

    const center = bucket.reduce(
      (acc, place) => ({
        latitude: acc.latitude + place.geometry.location.lat,
        longitude: acc.longitude + place.geometry.location.lng,
      }),
      { latitude: 0, longitude: 0 },
    );

    const typeCounts = new Map<string, number>();
    for (const place of bucket) {
      const type = getPrimaryExperienceType(place.types);
      if (!type) continue;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }
    const dominantType = Array.from(typeCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    clustered.push({
      id: `cluster:${clusterIndex}`,
      title: `${county} (${bucket.length})`,
      snippet: `${bucket.length} experiences in ${county}`,
      count: bucket.length,
      isCluster: true,
      typeTag: dominantType,
      coordinates: {
        latitude: center.latitude / bucket.length,
        longitude: center.longitude / bucket.length,
      },
    });

    clusterIndex += 1;
  }

  return clustered;
};

export const useExperienceMap = () => {
  // UI interaction state.
  const [selectedTabs, setSelectedTabs] = useState<string[]>(["Discover"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [markers, setMarkers] = useState<GooglePlace[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<GooglePlace | null>(
    null,
  );
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);
  const [currentCamera, setCurrentCamera] = useState<CameraState>({
    latitude: INITIAL_REGION.latitude,
    longitude: INITIAL_REGION.longitude,
    zoom: 14,
  });
  const isMountedRef = useRef(false);

  // Mutable refs used for debouncing and cache/inflight request deduplication.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedCameraRef = useRef<CameraState | null>(null);
  const lastFetchedBoundsRef = useRef<MapBounds | null>(null);
  const latestRequestIdRef = useRef(0);
  const loadingRequestIdRef = useRef<number | null>(null);
  const tileCacheRef = useRef<Record<string, TileCacheEntry>>({});
  const cachePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const inflightRequestsRef = useRef<Map<string, Promise<GooglePlace[]>>>(
    new Map(),
  );

  // Keep current bounds memoized from camera to avoid repeated heavy calculations.
  const currentBounds = useMemo(
    () => computeBoundsFromCamera(currentCamera),
    [currentCamera],
  );

  useEffect(() => {
    isMountedRef.current = true;

    // Hydrate cached tiles on startup so first map movement can reuse previous fetches.
    const loadPersistentTileCache = async () => {
      try {
        const raw = await AsyncStorage.getItem(TILE_CACHE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, TileCacheEntry>;
        if (!parsed || typeof parsed !== "object") return;

        tileCacheRef.current = compactCache(parsed);
      } catch {
        tileCacheRef.current = {};
      }
    };

    void loadPersistentTileCache();
    return () => {
      if (cachePersistTimerRef.current) {
        clearTimeout(cachePersistTimerRef.current);
      }
      isMountedRef.current = false;
    };
  }, []);

  const scheduleCachePersist = useCallback(() => {
    if (cachePersistTimerRef.current) {
      clearTimeout(cachePersistTimerRef.current);
    }

    // Debounce cache persistence to reduce IO churn during active map movement.
    cachePersistTimerRef.current = setTimeout(() => {
      void AsyncStorage.setItem(
        TILE_CACHE_STORAGE_KEY,
        JSON.stringify(compactCache(tileCacheRef.current)),
      ).catch(() => {
        // Cache persistence is a best effort optimization.
      });
    }, 500);
  }, []);

  // Fetch one tile with cache + in-flight request deduplication.
  const fetchTile = useCallback(
    async (latitude: number, longitude: number, includeAllPages = true) => {
      const tileKey = buildTileKey(latitude, longitude);
      const now = Date.now();
      const cached = tileCacheRef.current[tileKey];

      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        if (!includeAllPages || cached.isComplete !== false) {
          return cached.places;
        }
      }

      if (cached && !includeAllPages) {
        return cached.places;
      }

      const inflight = inflightRequestsRef.current.get(tileKey);
      if (inflight) {
        return inflight;
      }

      const request = (async () => {
        const url = buildNearbySearchUrl(latitude, longitude);
        const places = includeAllPages
          ? await fetchAllPlacesPages(url)
          : ((await fetchJson(url)).results as GooglePlace[]) || [];
        tileCacheRef.current[tileKey] = {
          timestamp: now,
          places,
          isComplete: includeAllPages,
        };
        tileCacheRef.current = compactCache(tileCacheRef.current);
        if (isMountedRef.current) scheduleCachePersist();
        return places;
      })();

      inflightRequestsRef.current.set(tileKey, request);
      try {
        return await request;
      } finally {
        inflightRequestsRef.current.delete(tileKey);
      }
    },
    [scheduleCachePersist],
  );

  const enrichViewportPlaces = useCallback(
    async ({
      requestId,
      queryPoints,
      nextBounds,
      seedPlaces,
    }: {
      requestId: number;
      queryPoints: Array<{ latitude: number; longitude: number }>;
      nextBounds: MapBounds;
      seedPlaces: GooglePlace[];
    }) => {
      const mergedById = new Map<string, GooglePlace>();
      for (const place of seedPlaces) {
        mergedById.set(buildExperienceKey(place), place);
      }

      for (
        let index = 0;
        index < queryPoints.length;
        index += FULL_BATCH_SIZE
      ) {
        if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
          return;
        }

        const batch = queryPoints.slice(index, index + FULL_BATCH_SIZE);
        const results = await Promise.all(
          batch.map((point) =>
            fetchTile(point.latitude, point.longitude, true),
          ),
        );

        for (const places of results) {
          for (const place of places) {
            mergedById.set(buildExperienceKey(place), place);
            if (mergedById.size >= MAX_TOTAL_MARKERS) break;
          }
          if (mergedById.size >= MAX_TOTAL_MARKERS) break;
        }
        if (mergedById.size >= MAX_TOTAL_MARKERS) break;
      }

      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return;
      }

      const enrichedMarkers = normalizePlacesForViewport(
        Array.from(mergedById.values()),
        nextBounds,
      );
      setMarkers(enrichedMarkers);
    },
    [fetchTile],
  );

  const fetchViewportPlaces = useCallback(
    async (camera: CameraState, reason: "initial" | "manual" | "move") => {
      const requestId = ++latestRequestIdRef.current;
      const isMoveFetch = reason === "move";
      let loadingFailSafe: ReturnType<typeof setTimeout> | null = null;

      // Fail fast when API key is not configured.
      if (!GOOGLE_API_KEY) {
        if (isMountedRef.current && requestId === latestRequestIdRef.current) {
          setErrorMessage("Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY");
          setIsLoadingPlaces(false);
        }
        return;
      }

      const nextBounds = computeBoundsFromCamera(camera);
      // Skip move-triggered fetches when the camera is still inside previous bounds.
      if (
        isMoveFetch &&
        !shouldRefetchForCamera(
          camera,
          lastFetchedCameraRef.current,
          lastFetchedBoundsRef.current,
        )
      ) {
        return;
      }

      // Reset user-facing error before starting a new fetch cycle.
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setErrorMessage(null);
        if (!isMoveFetch) {
          loadingRequestIdRef.current = requestId;
          setIsLoadingPlaces(true);
          // Ensure loading state cannot stay forever if upstream requests hang.
          loadingFailSafe = setTimeout(() => {
            if (
              isMountedRef.current &&
              loadingRequestIdRef.current === requestId
            ) {
              loadingRequestIdRef.current = null;
              setIsLoadingPlaces(false);
              setErrorMessage((previous) => previous || "Loading timed out");
            }
          }, LOADING_FAILSAFE_MS);
        }
      }

      try {
        // Build query points for current viewport and merge responses by place id.
        const allQueryPoints = generateViewportQueryPoints(nextBounds);
        const queryPoints = isMoveFetch
          ? allQueryPoints.slice(0, MOVE_QUERY_POINTS)
          : reason === "initial"
            ? allQueryPoints.slice(0, INITIAL_QUERY_POINTS)
            : allQueryPoints.slice(0, MANUAL_QUERY_POINTS);
        const mergedById = new Map<string, GooglePlace>();

        // Cache-first: quickly show available cached tiles before any network roundtrip.
        const cachedPlaces: GooglePlace[] = [];
        const now = Date.now();
        for (const point of queryPoints) {
          const tileKey = buildTileKey(point.latitude, point.longitude);
          const cached = tileCacheRef.current[tileKey];
          if (cached && now - cached.timestamp < CACHE_TTL_MS) {
            cachedPlaces.push(...cached.places);
          }
        }
        const cachedMarkers = normalizePlacesForViewport(
          cachedPlaces,
          nextBounds,
        );
        if (
          cachedMarkers.length > 0 &&
          isMountedRef.current &&
          requestId === latestRequestIdRef.current
        ) {
          setMarkers(cachedMarkers);
        }

        const batchSize = isMoveFetch ? MOVE_BATCH_SIZE : FULL_BATCH_SIZE;
        // Foreground fetch always uses first page for fast UI response.
        const includeAllPages = false;

        for (let index = 0; index < queryPoints.length; index += batchSize) {
          // Run in small batches to keep network pressure under control.
          const batch = queryPoints.slice(index, index + batchSize);
          const results = await Promise.all(
            batch.map((point) =>
              fetchTile(point.latitude, point.longitude, includeAllPages),
            ),
          );

          for (const places of results) {
            for (const place of places) {
              mergedById.set(buildExperienceKey(place), place);
              if (mergedById.size >= MAX_TOTAL_MARKERS) break;
            }
            if (mergedById.size >= MAX_TOTAL_MARKERS) break;
          }
          if (mergedById.size >= MAX_TOTAL_MARKERS) break;
        }

        // Commit marker list with hard cap to protect rendering performance.
        const finalMarkers = normalizePlacesForViewport(
          Array.from(mergedById.values()),
          nextBounds,
        );
        if (isMountedRef.current && requestId === latestRequestIdRef.current) {
          setMarkers(finalMarkers);
        }
        lastFetchedCameraRef.current = camera;
        lastFetchedBoundsRef.current = nextBounds;

        // Enrich in background with full pages after fast foreground pass.
        {
          const enrichmentPoints = queryPoints.slice(
            0,
            Math.min(ENRICH_QUERY_POINTS, queryPoints.length),
          );
          const seedPlaces = Array.from(mergedById.values());
          setTimeout(() => {
            void enrichViewportPlaces({
              requestId,
              queryPoints: enrichmentPoints,
              nextBounds,
              seedPlaces,
            });
          }, 0);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load places";
        if (isMountedRef.current && requestId === latestRequestIdRef.current) {
          setErrorMessage(message);
        }
      } finally {
        if (loadingFailSafe) {
          clearTimeout(loadingFailSafe);
        }
        if (isMountedRef.current && !isMoveFetch && loadingRequestIdRef.current === requestId) {
          loadingRequestIdRef.current = null;
          setIsLoadingPlaces(false);
        }
      }
    },
    [enrichViewportPlaces, fetchTile],
  );

  // Manual retry entrypoint for the screen.
  const loadPlaces = useCallback(async () => {
    await fetchViewportPlaces(currentCamera, "manual");
  }, [currentCamera, fetchViewportPlaces]);

  // Read recent searches from device storage.
  const loadRecentSearches = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENTS_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        if (isMountedRef.current) {
          setRecentSearches(
            parsed.filter((item): item is string => typeof item === "string"),
          );
        }
      }
    } catch {
      if (isMountedRef.current) {
        setRecentSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    // Prime first fetch for initial map viewport.
    void fetchViewportPlaces(
      {
        latitude: INITIAL_REGION.latitude,
        longitude: INITIAL_REGION.longitude,
        zoom: 14,
      },
      "initial",
    );
    void loadRecentSearches();
  }, [fetchViewportPlaces, loadRecentSearches]);

  useEffect(() => {
    // Cleanup debounce timer on unmount.
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Persist recents as user searches change.
    const saveRecentSearches = async () => {
      try {
        await AsyncStorage.setItem(
          RECENTS_STORAGE_KEY,
          JSON.stringify(recentSearches),
        );
      } catch {
        // Ignore storage write failure and keep app responsive.
      }
    };

    void saveRecentSearches();
  }, [recentSearches]);

  // Insert term at top and remove duplicates.
  const addRecentSearch = useCallback((term: string) => {
    setRecentSearches((previous) => {
      const withoutDuplicates = previous.filter((value) => value !== term);
      return [term, ...withoutDuplicates].slice(0, MAX_RECENTS);
    });
  }, []);

  // Clear recent search history.
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  // Ask for permission and return current location coordinates.
  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (isMountedRef.current) {
          setLocationPermissionDenied(true);
        }
        return null;
      }

      if (isMountedRef.current) {
        setLocationPermissionDenied(false);
      }
      const location = await ExpoLocation.getCurrentPositionAsync({});
      const coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      if (isMountedRef.current) {
        setUserLocation(coordinates);
      }
      return coordinates;
    } catch {
      if (isMountedRef.current) {
        setLocationPermissionDenied(true);
      }
      return null;
    }
  }, []);

  // Public helper used by the custom locate button.
  const locateUser = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && userLocation) return userLocation;
      return requestLocationPermission();
    },
    [requestLocationPermission, userLocation],
  );

  // Receive map camera movement from the map view and debounce viewport refetch.
  const onCameraMove = useCallback(
    (event: any) => {
      const coordinates = event?.coordinates;
      const zoom = event?.zoom;
      if (!coordinates || typeof zoom !== "number") return;

      const nextCamera: CameraState = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        zoom,
      };
      if (isMountedRef.current) {
        setCurrentCamera(nextCamera);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void fetchViewportPlaces(nextCamera, "move");
      }, CAMERA_DEBOUNCE_MS);
    },
    [fetchViewportPlaces],
  );

  // Load marker details lazily when user taps a marker.
  const selectMarkerById = useCallback(
    async (markerId: string) => {
      const baseMarker = markers.find(
        (marker) => String(marker.place_id) === String(markerId),
      );
      if (!baseMarker) return null;

      if (isMountedRef.current) {
        setSelectedMarker(baseMarker);
        setIsFetchingDetails(true);
      }

      try {
        if (!GOOGLE_API_KEY) return baseMarker;

        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${baseMarker.place_id}&fields=name,rating,photos,vicinity,user_ratings_total&key=${GOOGLE_API_KEY}`;
        const detailsPayload = await fetchJson(detailsUrl);

        if (detailsPayload.result) {
          const merged: GooglePlace = {
            ...baseMarker,
            ...detailsPayload.result,
            geometry: baseMarker.geometry,
          };
          if (isMountedRef.current) {
            setSelectedMarker(merged);
          }
          return merged;
        }

        return baseMarker;
      } catch {
        return baseMarker;
      } finally {
        if (isMountedRef.current) {
          setIsFetchingDetails(false);
        }
      }
    },
    [markers],
  );

  // Toggle a single filter chip.
  const toggleFilter = useCallback((item: string) => {
    setActiveFilters((previous) =>
      previous.includes(item)
        ? previous.filter((active) => active !== item)
        : [...previous, item],
    );
  }, []);

  // Toggle top quick tabs, with Discover acting as default mode.
  const toggleQuickTab = useCallback((item: string) => {
    setSelectedTabs((previous) => {
      const isActive = previous.includes(item);

      if (item === "Discover") {
        return isActive ? [] : ["Discover"];
      }

      const withoutDiscover = previous.filter((value) => value !== "Discover");
      if (isActive) {
        return withoutDiscover.filter((value) => value !== item);
      }
      return [...withoutDiscover, item];
    });
  }, []);

  // Reset all modal filter state.
  const resetFilters = useCallback(() => {
    setActiveFilters([]);
    setIsVerifiedOnly(false);
  }, []);

  // Apply viewport, quick-tab, and advanced filter rules.
  const filteredMarkers = useMemo(() => {
    let list = markers.filter((marker) =>
      isInsideBounds(
        marker.geometry.location.lat,
        marker.geometry.location.lng,
        currentBounds,
      ),
    );

    if (!selectedTabs.includes("Discover")) {
      list = list.filter((marker) => {
        if (selectedTabs.includes("Free")) return marker.price_level === 0;
        return true;
      });
    }

    if (activeFilters.length > 0 || isVerifiedOnly) {
      list = list.filter((marker) => {
        if (isVerifiedOnly && (marker.rating || 0) < 4.5) return false;

        if (activeFilters.length > 0) {
          return activeFilters.some((filter) => {
            const mappedTypes = CATEGORY_MAP[filter] || [];
            const matchesType = marker.types?.some((type) =>
              mappedTypes.includes(type),
            );
            const matchesName = marker.name
              .toLowerCase()
              .includes(filter.toLowerCase());
            return Boolean(matchesType || matchesName);
          });
        }

        return true;
      });
    }

    return list;
  }, [markers, activeFilters, isVerifiedOnly, selectedTabs, currentBounds]);

  // Cluster filtered markers for map display.
  const clusteredMarkers = useMemo(
    () => clusterPlaces(filteredMarkers, currentBounds, currentCamera.zoom),
    [filteredMarkers, currentBounds, currentCamera.zoom],
  );

  // Build lookup map for O(1) cluster access during marker click handling.
  const clusterMapById = useMemo(() => {
    const map = new Map<string, ClusterMapMarker>();
    for (const marker of clusteredMarkers) {
      map.set(marker.id, marker);
    }
    return map;
  }, [clusteredMarkers]);

  // Search should use the full marker set currently loaded in memory.
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return markers.filter((marker) =>
      marker.name.toLowerCase().startsWith(query),
    );
  }, [markers, searchQuery]);

  // Expose cluster lookup helper for the map screen.
  const getClusterMarkerById = useCallback(
    (id: string) => {
      return clusterMapById.get(id) || null;
    },
    [clusterMapById],
  );

  return {
    activeFilters,
    addRecentSearch,
    clearRecentSearches,
    clusteredMarkers,
    currentZoom: currentCamera.zoom,
    errorMessage,
    filteredMarkers,
    getClusterMarkerById,
    isFetchingDetails,
    isFilterModalVisible,
    isLoadingPlaces,
    isSearchActive,
    isVerifiedOnly,
    locationPermissionDenied,
    markers,
    onCameraMove,
    locateUser,
    recentSearches,
    requestLocationPermission,
    resetFilters,
    searchQuery,
    searchResults,
    selectMarkerById,
    selectedMarker,
    selectedTabs,
    setActiveFilters,
    setIsFilterModalVisible,
    setIsSearchActive,
    setIsVerifiedOnly,
    setSearchQuery,
    setSelectedMarker,
    toggleFilter,
    toggleQuickTab,
    userLocation,
    loadPlaces,
    totalPlacesInViewport: markers.length,
  };
};
