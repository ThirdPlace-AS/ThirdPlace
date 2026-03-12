// ============================================================
// services/supabase/friendLocations.ts
// ============================================================
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./client";

// ============================================================
// hooks/useFriendLocations.ts
// ============================================================
// (bundled here to keep Phase 2 files organised)
import * as ExpoLocation from "expo-location";
import { useEffect, useRef, useState } from "react";

export interface FriendLocation {
  user_id:      string;
  latitude:     number;
  longitude:    number;
  updated_at:   string;
  profile: {
    display_name: string;
    avatar_url:   string | null;
  };
}

export async function upsertMyLocation(
  latitude:  number,
  longitude: number,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("friend_locations").upsert({
    user_id:   user.id,
    // PostGIS POINT — longitude first
    location:  `POINT(${longitude} ${latitude})`,
    updated_at: new Date().toISOString(),
  });
}

// Realtime subscription — receives INSERT/UPDATE from friend_locations.
// RLS on that table ensures only mutual friends' rows are returned.
export function subscribeFriendLocations(
  onUpdate: (loc: FriendLocation) => void,
): RealtimeChannel {
  return supabase
    .channel("friend_locations")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "friend_locations" },
      async (payload) => {
        const row = payload.new as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", row.user_id)
          .single();

        // Parse PostGIS POINT string "POINT(lng lat)"
        const match = row.location?.match(/POINT\(([^ ]+) ([^ )]+)\)/);
        if (!match || !profile) return;

        onUpdate({
          user_id:    row.user_id,
          longitude:  parseFloat(match[1]),
          latitude:   parseFloat(match[2]),
          updated_at: row.updated_at,
          profile,
        });
      },
    )
    .subscribe();
}

export function useFriendLocations(shareMyLocation: boolean) {
  const [friendLocations, setFriendLocations] = useState<Map<string, FriendLocation>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const watchRef   = useRef<ExpoLocation.LocationSubscription | null>(null);

  // Push my location every time GPS updates (while sharing is on)
  useEffect(() => {
    if (!shareMyLocation) {
      watchRef.current?.remove();
      return;
    }

    (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      watchRef.current = await ExpoLocation.watchPositionAsync(
        { accuracy: ExpoLocation.Accuracy.Balanced, distanceInterval: 50 },
        (loc) => {
          void upsertMyLocation(loc.coords.latitude, loc.coords.longitude);
        },
      );
    })();

    return () => { watchRef.current?.remove(); };
  }, [shareMyLocation]);

  // Subscribe to friend location updates
  useEffect(() => {
    channelRef.current = subscribeFriendLocations((loc) => {
      setFriendLocations((prev) => {
        const next = new Map(prev);
        next.set(loc.user_id, loc);
        return next;
      });
    });
    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  const friends = Array.from(friendLocations.values());
  return { friends };
}