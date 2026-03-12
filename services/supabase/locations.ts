// ─────────────────────────────────────────────────────────────
// services/supabase/locations.ts
// ─────────────────────────────────────────────────────────────
import { parsePostGISPoint, toPostGISPoint } from "@/lib/geo";
import type { FriendLocation } from "@/types";

export async function upsertMyLocation(
  latitude:  number,
  longitude: number,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("friend_locations").upsert({
    user_id:    user.id,
    location:   toPostGISPoint(longitude, latitude),
    updated_at: new Date().toISOString(),
  });
}

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

        const coords = parsePostGISPoint(row.location ?? "");
        if (!coords || !profile) return;

        onUpdate({
          user_id:    row.user_id,
          longitude:  coords.longitude,
          latitude:   coords.latitude,
          updated_at: row.updated_at,
          profile,
        });
      },
    )
    .subscribe();
}



































