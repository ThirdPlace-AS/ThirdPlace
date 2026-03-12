// ─────────────────────────────────────────────────────────────
// hooks/useFriendLocations.ts
// Opt-in friend location sharing.
// Sharing toggle → pushes GPS updates to Supabase every 50m.
// Always subscribes to friends' locations via Realtime (RLS
// enforces mutual friendship at the DB level).
// ─────────────────────────────────────────────────────────────
import * as ExpoLocation from "expo-location";
import { useEffect, useRef, useState } from "react";

import { subscribeFriendLocations, upsertMyLocation } from "@/services/supabase/locations";
import type { FriendLocation } from "@/types";
 
export function useFriendLocations(shareMyLocation: boolean) {
  const [friends,    setFriends]    = useState<FriendLocation[]>([]);
  const channelRef = useRef<ReturnType<typeof subscribeFriendLocations> | null>(null);
  const watchRef   = useRef<ExpoLocation.LocationSubscription | null>(null);
 
  // Start/stop GPS broadcast based on sharing toggle
  useEffect(() => {
    if (!shareMyLocation) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }
    (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      watchRef.current = await ExpoLocation.watchPositionAsync(
        { accuracy: ExpoLocation.Accuracy.Balanced, distanceInterval: 50 },
        (loc) => void upsertMyLocation(loc.coords.latitude, loc.coords.longitude),
      );
    })();
    return () => { watchRef.current?.remove(); };
  }, [shareMyLocation]);
 
  // Always subscribe to incoming friend updates
  useEffect(() => {
    channelRef.current = subscribeFriendLocations((loc) => {
      setFriends((prev) => {
        const without = prev.filter((f) => f.user_id !== loc.user_id);
        return [...without, loc];
      });
    });
    return () => { channelRef.current?.unsubscribe(); };
  }, []);
 
  return { friends };
}
 