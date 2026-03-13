// ─────────────────────────────────────────────────────────────
// services/supabase/experiences.ts
// All DB calls for the experiences table.
// Hooks call these — screens never import supabase directly.
// ─────────────────────────────────────────────────────────────
import { OSM_TO_EXPERIENCE_CATEGORY } from "@/lib/constants";
import { toPostGISPoint } from "@/lib/geo";
import type { OSMPlace } from "@/types";
import type { CreateExperiencePayload, Experience } from "@/types/experience";
import { supabase } from "./client";

// ── Fetch nearby experiences via PostGIS RPC ──────────────────
export async function fetchNearbyExperiences(
  longitude:    number,
  latitude:     number,
  radiusMetres: number = 5_000,
): Promise<Experience[]> {
  const { data, error } = await supabase.rpc("get_nearby_experiences", {
    p_longitude:     longitude,
    p_latitude:      latitude,
    p_radius_metres: radiusMetres,
  });
  if (!error) return (data ?? []) as Experience[];

  // Fallback: bounding-box query when RPC is unavailable
  const latDelta = radiusMetres / 111_320;
  const lngDelta =
    radiusMetres / Math.max(1, 111_320 * Math.cos((latitude * Math.PI) / 180));

  const { data: fallback, error: fallbackError } = await supabase
    .from("experiences_with_counts")
    .select("*")
    .gte("latitude", latitude - latDelta)
    .lte("latitude", latitude + latDelta)
    .gte("longitude", longitude - lngDelta)
    .lte("longitude", longitude + lngDelta)
    .limit(200);

  if (!fallbackError) return (fallback ?? []) as Experience[];

  const { data: rawFallback, error: rawError } = await supabase
    .from("experiences")
    .select("*")
    .gte("latitude", latitude - latDelta)
    .lte("latitude", latitude + latDelta)
    .gte("longitude", longitude - lngDelta)
    .lte("longitude", longitude + lngDelta)
    .limit(200);

  if (rawError) throw new Error(
    `[Experiences] Fetch failed: ${error.message}; fallback: ${fallbackError.message}; raw: ${rawError.message}`,
  );

  return (rawFallback ?? []) as Experience[];
}

// ── Fetch nearby OSM places via PostGIS RPC ───────────────────
export async function fetchNearbyOSMPlaces(
  longitude:    number,
  latitude:     number,
  radiusMetres: number = 3_000,
): Promise<OSMPlace[]> {
  const { data, error } = await supabase.rpc("get_nearby_osm_places", {
    p_longitude:     longitude,
    p_latitude:      latitude,
    p_radius_metres: radiusMetres,
  });
  if (error) throw new Error(`[OSM] Fetch failed: ${error.message}`);
  return (data ?? []) as OSMPlace[];
}

// ── Fetch single experience ───────────────────────────────────
export async function fetchExperienceById(id: string): Promise<Experience> {
  const { data, error } = await supabase
    .from("experiences_with_counts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`[Experiences] Single fetch failed: ${error.message}`);
  return data as Experience;
}

// ── Promote OSM venue → draft experience ──────────────────────
// Called when a user taps an OSM pin and hits "Start experience here".
// Creates a real experiences row linked via osm_place_id, marks it
// is_draft=true, then auto-joins the creator (which may also trigger
// the chat-activation trigger if the creator is the 2nd participant).
export async function promoteOSMToExperience(venue: OSMPlace): Promise<Experience> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("[Experiences] Must be authenticated");

  // Map OSM place type → experience category enum value
  const category = OSM_TO_EXPERIENCE_CATEGORY[venue.place_type] ?? "social";

  // Draft starts 15 minutes from now and lasts 3 hours by default.
  // Creator can edit these in ExperienceDetailSheet before publishing.
  const now       = new Date();
  const startsAt  = new Date(now.getTime() + 15 * 60 * 1000);
  const endsAt    = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("experiences")
    .insert({
      creator_id:   user.id,
      title:        `${venue.name}`,    // creator can rename in detail sheet
      description:  "",
      category,
      location:     toPostGISPoint(venue.longitude, venue.latitude),
      address:      venue.address ?? "",
      osm_place_id: venue.osm_id,
      is_draft:     true,               // hidden from other users until published
      starts_at:    startsAt.toISOString(),
      ends_at:      endsAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`[Experiences] Promote failed: ${error.message}`);

  // Creator auto-joins — also fires the chat-activation trigger
  const { error: joinError } = await supabase
    .from("experience_participants")
    .insert({ experience_id: data.id, user_id: user.id });

  // 23505 = already joined, safe to ignore
  if (joinError && joinError.code !== "23505") {
    throw new Error(`[Experiences] Auto-join failed: ${joinError.message}`);
  }

  return data as Experience;
}

// ── Create experience (manual form) ───────────────────────────
export async function createExperience(
  payload: CreateExperiencePayload,
): Promise<Experience> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("[Experiences] Must be authenticated to create");

  const { data, error } = await supabase
    .from("experiences")
    .insert({
      creator_id:       user.id,
      title:            payload.title,
      description:      payload.description,
      category:         payload.category,
      location:         toPostGISPoint(payload.longitude, payload.latitude),
      address:          payload.address ?? "",
      cover_image_url:  payload.cover_image_url  ?? null,
      max_participants: payload.max_participants ?? null,
      starts_at:        payload.starts_at,
      ends_at:          payload.ends_at ?? null,
      is_draft:         false,  // manual creation is always published immediately
    })
    .select()
    .single();

  if (error) throw new Error(`[Experiences] Create failed: ${error.message}`);

  await supabase
    .from("experience_participants")
    .insert({ experience_id: data.id, user_id: user.id });

  return data as Experience;
}

// ── Publish a draft experience ────────────────────────────────
export async function publishExperience(experienceId: string): Promise<void> {
  const { error } = await supabase
    .from("experiences")
    .update({ is_draft: false })
    .eq("id", experienceId);
  if (error) throw new Error(`[Experiences] Publish failed: ${error.message}`);
}

// ── Join / leave ──────────────────────────────────────────────
export async function joinExperience(experienceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("[Experiences] Must be authenticated to join");

  const { error } = await supabase
    .from("experience_participants")
    .insert({ experience_id: experienceId, user_id: user.id });

  if (error && error.code !== "23505") throw new Error(error.message);
}

export async function leaveExperience(experienceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("[Experiences] Must be authenticated");

  const { error } = await supabase
    .from("experience_participants")
    .delete()
    .eq("experience_id", experienceId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

// ── Fetch experiences the current user has joined ─────────────
export async function fetchJoinedExperiences(): Promise<Experience[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("experience_participants")
    .select("experience:experiences(*)")
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => row.experience).filter(Boolean);
}