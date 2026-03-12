// ─────────────────────────────────────────────────────────────
// hooks/useOSMPlaces.ts
// Fetches OSM venue data from PostGIS cache (populated by Edge Fn).
// Kept separate from useExperiences so the map can show OSM pins
// independently — OSM pins are static context, not interactive.
// ─────────────────────────────────────────────────────────────
import { fetchNearbyOSMPlaces } from "@/services/supabase/experiences";
import type { OSMPlace } from "@/types";
import { useCallback, useState } from "react";
 
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