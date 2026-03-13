// ─────────────────────────────────────────────────────────────
// services/supabase/search.ts
// Unified search across experiences, profiles, and OSM places.
// Single RPC call — ranked by pg_trgm similarity + proximity.
// ─────────────────────────────────────────────────────────────
import { supabase } from "./client";

export type SearchResultType = "experience" | "person" | "place";

export interface SearchResult {
  result_type: SearchResultType;
  id:          string;
  title:       string;
  subtitle:    string;   // category | @username | place_type
  address:     string;
  latitude:    number | null;
  longitude:   number | null;
  avatar_url:  string | null;
  score:       number;
  distance_m:  number | null;
}

export async function searchAll(
  query:     string,
  latitude:  number,
  longitude: number,
  limitEach  = 5,
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase.rpc("search_all", {
    p_query:      query.trim(),
    p_latitude:   latitude,
    p_longitude:  longitude,
    p_limit_each: limitEach,
  });

  if (error) throw new Error(`[Search] RPC failed: ${error.message}`);
  return (data ?? []) as SearchResult[];
}