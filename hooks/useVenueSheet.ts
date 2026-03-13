// ─────────────────────────────────────────────────────────────
// hooks/useVenueSheet.ts
// State + logic for the OSM venue bottom sheet.
// Handles: open/close, draft experience creation, navigation.
// ─────────────────────────────────────────────────────────────
import { promoteOSMToExperience } from "@/services/supabase/experiences";
import type { OSMPlace } from "@/types";
import { router } from "expo-router";
import { useCallback, useState } from "react";

type SheetState = "closed" | "open";

interface VenueSheetState {
  venue:        OSMPlace | null;
  sheetState:   SheetState;
  isPromoting:  boolean;   // true while DB insert is in flight
  promoteError: string | null;
}

interface VenueSheetActions {
  openVenueSheet:  (venue: OSMPlace) => void;
  closeVenueSheet: () => void;
  startExperience: () => Promise<void>;  // promote OSM → experience + navigate
  clearError:      () => void;
}

export function useVenueSheet(): VenueSheetState & VenueSheetActions {
  const [venue,        setVenue]        = useState<OSMPlace | null>(null);
  const [sheetState,   setSheetState]   = useState<SheetState>("closed");
  const [isPromoting,  setIsPromoting]  = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const openVenueSheet = useCallback((v: OSMPlace) => {
    setVenue(v);
    setPromoteError(null);
    setSheetState("open");
  }, []);

  const closeVenueSheet = useCallback(() => {
    setSheetState("closed");
    // Delay clearing venue so the sheet can animate out with content still visible
    setTimeout(() => setVenue(null), 350);
  }, []);

  const startExperience = useCallback(async () => {
    if (!venue) return;
    setIsPromoting(true);
    setPromoteError(null);
    try {
      const experience = await promoteOSMToExperience(venue);
      closeVenueSheet();
      // Navigate to the experience detail so the creator can confirm/publish
      router.push({
        pathname: "/(app)/map/[experienceId]",
        params: { experienceId: experience.id },
      });
    } catch (e) {
      setPromoteError(
        e instanceof Error ? e.message : "Failed to create experience"
      );
    } finally {
      setIsPromoting(false);
    }
  }, [venue, closeVenueSheet]);

  const clearError = useCallback(() => setPromoteError(null), []);

  return {
    venue,
    sheetState,
    isPromoting,
    promoteError,
    openVenueSheet,
    closeVenueSheet,
    startExperience,
    clearError,
  };
}