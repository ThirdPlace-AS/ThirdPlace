// ─────────────────────────────────────────────────────────────
// hooks/useExperiences.ts
// Fetches and caches ThirdPlace experiences from Supabase/PostGIS.
// Owns the 1km refetch threshold and loading/error state.
// Does NOT own camera state — that stays in the map screen.
// ─────────────────────────────────────────────────────────────
import { MAP_CONFIG } from "@/lib/constants";
import { haversineMetres } from "@/lib/geo";
import { triggerOSMCache } from "@/services/osm/overpass";
import {
  fetchNearbyExperiences,
  joinExperience,
  leaveExperience,
} from "@/services/supabase/experiences";
import type { Coordinates } from "@/types";
import type { Experience } from "@/types/experience";
import { useCallback, useRef, useState } from "react";

// Safety valve — clear loading state if fetch hangs > 10s
const LOADING_FAILSAFE_MS = 10_000;

interface ExperiencesState {
  experiences: Experience[];
  isLoading:   boolean;
  error:       string | null;
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
    // Skip if user hasn't moved far enough (unless forced on mount)
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

    const failsafe = setTimeout(() => {
      if (requestCountRef.current === requestId) setIsLoading(false);
    }, LOADING_FAILSAFE_MS);

    try {
      const data = await fetchNearbyExperiences(longitude, latitude);
      if (requestCountRef.current !== requestId) return; // stale response

      setExperiences(data);
      lastFetchRef.current = { lat: latitude, lng: longitude };

      // Prime OSM cache in the background — non-blocking
      triggerOSMCache({ latitude, longitude } as Coordinates);
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