// ─────────────────────────────────────────────────────────────
// hooks/useOSMPlaces.ts
// Fetches OSM venue data from PostGIS cache.
// OSM pins are static context on the map — not interactive.
// Kept separate from useExperiences so they load independently.
// ─────────────────────────────────────────────────────────────
import { haversineMetres } from "@/lib/geo";
import { fetchNearbyOSMPlaces } from "@/services/supabase/experiences";
import type { OSMPlace } from "@/types";
import { useCallback, useRef, useState } from "react";

// Only refetch OSM if user moves > 2km (OSM places change rarely)
const OSM_REFETCH_THRESH_M = 2_000;

interface OSMState {
  osmPlaces: OSMPlace[];
  isLoading: boolean;
  error:     string | null;
}

interface OSMActions {
  fetchNearby: (longitude: number, latitude: number, force?: boolean) => Promise<void>;
}

export function useOSMPlaces(): OSMState & OSMActions {
  const [osmPlaces, setOsmPlaces] = useState<OSMPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null);

  const fetchNearby = useCallback(async (
    longitude: number,
    latitude:  number,
    force      = false,
  ) => {
    // Skip if user hasn't moved far enough (OSM data is static, 2km threshold)
    if (!force && lastFetchRef.current) {
      const moved = haversineMetres(
        lastFetchRef.current.lat, lastFetchRef.current.lng,
        latitude, longitude,
      );
      if (moved < OSM_REFETCH_THRESH_M) return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNearbyOSMPlaces(longitude, latitude);
      setOsmPlaces(data);
      lastFetchRef.current = { lat: latitude, lng: longitude };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load places");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { osmPlaces, isLoading, error, fetchNearby };
}