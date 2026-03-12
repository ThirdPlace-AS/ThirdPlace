// ─────────────────────────────────────────────────────────────
// hooks/useLocation.ts
// GPS permission handling + live position tracking.
// Separated from useExperiences so location state can be shared
// across the map screen and the friend location hook without
// triggering double permission dialogs.
// ─────────────────────────────────────────────────────────────
import { MAP_CONFIG } from "@/lib/constants";
import type { Coordinates } from "@/types";
import * as ExpoLocation from "expo-location";
import { useCallback, useState } from "react";
 
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