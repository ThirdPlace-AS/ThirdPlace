// ─────────────────────────────────────────────────────────────
// services/osm/overpass.ts
// Triggers the Supabase Edge Function which checks PostGIS cache
// before hitting Overpass. App code never calls Overpass directly.
// ─────────────────────────────────────────────────────────────
import { buildOSMBbox } from "@/lib/geo";
import { supabase } from "@/services/supabase/client";
import type { Coordinates } from "@/types";

export async function triggerOSMCache(coords: Coordinates): Promise<void> {
  // Fire-and-forget — we don't await in the critical path.
  // The Edge Function returns instantly on a cache hit.
  void supabase.functions.invoke("osm-cache", {
    body: {
      longitude: coords.longitude,
      latitude:  coords.latitude,
      bbox:      buildOSMBbox(coords),
    },
  });
}
