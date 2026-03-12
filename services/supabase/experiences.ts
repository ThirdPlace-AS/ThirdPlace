// ─────────────────────────────────────────────────────────────
// services/supabase/experiences.ts
// All DB calls for the experiences table.
// Hooks call these — screens never import supabase directly.
// ─────────────────────────────────────────────────────────────
import { toPostGISPoint } from "@/lib/geo";
import { OSMPlace } from "@/types";
import { CreateExperiencePayload, Experience } from "@/types/experience";
import { supabase } from "./client";

// ── Fetch nearby experiences via PostGIS RPC ──────────────────
// get_nearby_experiences() is defined in migration 008.
// ST_DWithin on a GIST-indexed geography column — single indexed call.
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

  // Fallback: simple bounding-box query when RPC is unavailable.
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

  if (!fallbackError) {
    return (fallback ?? []) as Experience[];
  }

  const { data: rawFallback, error: rawError } = await supabase
    .from("experiences")
    .select("*")
    .gte("latitude", latitude - latDelta)
    .lte("latitude", latitude + latDelta)
    .gte("longitude", longitude - lngDelta)
    .lte("longitude", longitude + lngDelta)
    .limit(200);

  if (rawError) {
    throw new Error(
      `[Experiences] Fetch failed: ${error.message}; fallback failed: ${fallbackError.message}; raw fallback failed: ${rawError.message}`,
    );
  }

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

// ── Create experience ─────────────────────────────────────────
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
    })
    .select()
    .single();

  if (error) throw new Error(`[Experiences] Create failed: ${error.message}`);

  // Creator automatically joins their own experience
  await supabase
    .from("experience_participants")
    .insert({ experience_id: data.id, user_id: user.id });

  return data as Experience;
}

// ── Join / leave ──────────────────────────────────────────────
export async function joinExperience(experienceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("[Experiences] Must be authenticated to join");

  const { error } = await supabase
    .from("experience_participants")
    .insert({ experience_id: experienceId, user_id: user.id });

  // 23505 = unique_violation — already joined, not an error
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
