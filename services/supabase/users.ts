// ─────────────────────────────────────────────────────────────
// services/supabase/users.ts

import { supabase } from "./client";

// ─────────────────────────────────────────────────────────────
export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(`[Users] Fetch failed: ${error.message}`);
  return data;
}
 
export async function updateProfile(
  userId:  string,
  updates: { display_name?: string; bio?: string; avatar_url?: string },
) {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  if (error) throw new Error(`[Users] Update failed: ${error.message}`);
}
 
export async function fetchParticipantCounts(userId: string) {
  const [joined, created] = await Promise.all([
    supabase
      .from("experience_participants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("experiences")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", userId),
  ]);
  return { joinedCount: joined.count ?? 0, createdCount: created.count ?? 0 };
}