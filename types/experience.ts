// ─────────────────────────────────────────────────────────────
// types/experience.ts
// ─────────────────────────────────────────────────────────────

export type ExperienceCategory =
  | "outdoor" | "food" | "social" | "music"
  | "sport"   | "coffee" | "study" | "culture";

export interface Experience {
  id:                string;
  creator_id:        string;
  title:             string;
  description:       string;
  category:          ExperienceCategory;
  longitude:         number;
  latitude:          number;
  address:           string;
  cover_image_url:   string | null;
  max_participants:  number | null;
  participant_count: number;
  starts_at:         string;   // ISO 8601
  ends_at:           string | null;
  created_at:        string;
}

export interface CreateExperiencePayload {
  title:             string;
  description:       string;
  category:          ExperienceCategory;
  longitude:         number;
  latitude:          number;
  address?:          string;
  cover_image_url?:  string;
  max_participants?: number;
  starts_at:         string;
  ends_at?:          string;
}

// GeoJSON Feature shape used by Mapbox ShapeSource
export interface ExperienceFeature {
  type:       "Feature";
  geometry:   { type: "Point"; coordinates: [number, number] };
  properties: Experience & { isCluster?: false };
}

export interface ExperienceFeatureCollection {
  type:     "FeatureCollection";
  features: ExperienceFeature[];
}