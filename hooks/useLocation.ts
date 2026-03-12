// ─────────────────────────────────────────────────────────────
// hooks/useLocation.ts
// GPS permission handling + live position tracking.
// Separated from useExperiences so location state can be shared
// across the map screen and the friend location hook without
// triggering double permission dialogs.
// ─────────────────────────────────────────────────────────────
import { LOADING_FAILSAFE_MS, MAP_CONFIG } from "@/lib/constants";
import type { Coordinates, Experience, OSMPlace } from "@/types";
import * as ExpoLocation from "expo-location";
import { useCallback, useState } from "react";


// ─────────────────────────────────────────────────────────────
// hooks/useExperiences.ts
// Fetches and caches ThirdPlace experiences from Supabase/PostGIS.
// Owns the 1km refetch threshold and loading/error state.
// Does NOT own camera state — that stays in the map screen.
// ─────────────────────────────────────────────────────────────
import { haversineMetres } from "@/lib/geo";
import { triggerOSMCache } from "@/services/osm/overpass";
import {
  fetchNearbyExperiences,
  joinExperience,
  leaveExperience,
} from "@/services/supabase/experiences";
import { useRef } from "react";




// ─────────────────────────────────────────────────────────────
// hooks/useOSMPlaces.ts
// Fetches OSM venue data from PostGIS cache (populated by Edge Fn).
// Kept separate from useExperiences so the map can show OSM pins
// independently — OSM pins are static context, not interactive.
// ─────────────────────────────────────────────────────────────
import { fetchNearbyOSMPlaces } from "@/services/supabase/experiences";


interface LocationState {
  coords:            Coordinates | null;
  permissionDenied:  boolean;
  isLocating:        boolean;
}

interface LocationActions {
  requestLocation:   () => Promise<Coordinates | null>;
  reverseGeocode:    (coords: Coordinates) => Promise<string>;
}

export const OSLO_DEFAULT: Coordinates = {
  latitude:  MAP_CONFIG.DEFAULT_LAT,
  longitude: MAP_CONFIG.DEFAULT_LNG,
};

export function useLocation(): LocationState & LocationActions {
  const [coords,           setCoords]           = useState<Coordinates | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLocating,       setIsLocating]       = useState(false);

  const requestLocation = useCallback(async (): Promise<Coordinates | null> => {
    setIsLocating(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        return null;
      }
      setPermissionDenied(false);
      const loc    = await ExpoLocation.getCurrentPositionAsync({});
      const result = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(result);
      return result;
    } catch {
      setPermissionDenied(true);
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Uses Expo's built-in reverse geocoder (OS-level, free — no API key needed).
  const reverseGeocode = useCallback(async (coords: Coordinates): Promise<string> => {
    try {
      const [geo] = await ExpoLocation.reverseGeocodeAsync(coords);
      if (!geo) return "";
      return [geo.name, geo.street, geo.district, geo.city]
        .filter(Boolean)
        .join(", ");
    } catch {
      return "";
    }
  }, []);

  return { coords, permissionDenied, isLocating, requestLocation, reverseGeocode };
}

interface ExperiencesState {
  experiences:  Experience[];
  isLoading:    boolean;
  error:        string | null;
}

interface ExperiencesActions {
  fetchNearby: (longitude: number, latitude: number, force?: boolean) => Promise<void>;
  join:        (experienceId: string) => Promise<void>;
  leave:       (experienceId: string) => Promise<void>;
  clearError:  () => void;
}

export function useExperiences(): ExperiencesState & ExperiencesActions {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Tracks the centre of the last successful fetch.
  // A new fetch is only triggered if the user has moved >1km from here.
  const lastFetchRef    = useRef<{ lat: number; lng: number } | null>(null);
  const requestCountRef = useRef(0);

  const fetchNearby = useCallback(async (
    longitude: number,
    latitude:  number,
    force      = false,
  ) => {
    // Skip if user hasn't moved far enough (unless forced)
    if (!force && lastFetchRef.current) {
      const moved = haversineMetres(
        lastFetchRef.current.lat, lastFetchRef.current.lng,
        latitude, longitude,
      );
      if (moved < MAP_CONFIG.REFETCH_THRESH_M) return;
    }

    const requestId = ++requestCountRef.current;
    setIsLoading(true);
    setError(null);

    // Safety valve — clear loading state if fetch hangs
    const failsafe = setTimeout(() => {
      if (requestCountRef.current === requestId) setIsLoading(false);
    }, LOADING_FAILSAFE_MS);

    try {
      const data = await fetchNearbyExperiences(longitude, latitude);
      if (requestCountRef.current !== requestId) return; // stale response

      setExperiences(data);
      lastFetchRef.current = { lat: latitude, lng: longitude };

      // Prime OSM cache in the background — non-blocking
      triggerOSMCache({ latitude, longitude });
    } catch (e) {
      if (requestCountRef.current === requestId) {
        setError(e instanceof Error ? e.message : "Failed to load experiences");
      }
    } finally {
      clearTimeout(failsafe);
      if (requestCountRef.current === requestId) setIsLoading(false);
    }
  }, []);

  const join = useCallback(async (experienceId: string) => {
    await joinExperience(experienceId);
    // Optimistically increment participant count in local state
    setExperiences((prev) =>
      prev.map((e) =>
        e.id === experienceId
          ? { ...e, participant_count: e.participant_count + 1 }
          : e,
      ),
    );
  }, []);

  const leave = useCallback(async (experienceId: string) => {
    await leaveExperience(experienceId);
    setExperiences((prev) =>
      prev.map((e) =>
        e.id === experienceId
          ? { ...e, participant_count: Math.max(0, e.participant_count - 1) }
          : e,
      ),
    );
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { experiences, isLoading, error, fetchNearby, join, leave, clearError };
}

interface OSMState {
  osmPlaces: OSMPlace[];
  isLoading: boolean;
  error:     string | null;
}

interface OSMActions {
  fetchNearby: (longitude: number, latitude: number) => Promise<void>;
}

export function useOSMPlaces(): OSMState & OSMActions {
  const [osmPlaces, setOsmPlaces] = useState<OSMPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fetchNearby = useCallback(async (longitude: number, latitude: number) => {
    setIsLoading(true);
    try {
      const data = await fetchNearbyOSMPlaces(longitude, latitude);
      setOsmPlaces(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load places");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { osmPlaces, isLoading, error, fetchNearby };
}