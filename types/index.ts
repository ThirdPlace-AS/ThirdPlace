// ─────────────────────────────────────────────────────────────
// types/user.ts
// ─────────────────────────────────────────────────────────────
export interface Profile {
  id:           string;
  display_name: string;
  avatar_url:   string | null;
  bio:          string | null;
  created_at:   string;
}

export interface Friendship {
  id:           string;
  requester_id: string;
  addressee_id: string;
  status:       "pending" | "accepted" | "blocked";
  created_at:   string;
}

// ─────────────────────────────────────────────────────────────
// types/chat.ts
// ─────────────────────────────────────────────────────────────
export interface Message {
  id:            string;
  experience_id: string;
  sender_id:     string;
  content:       string;
  created_at:    string;
  sender?: Pick<Profile, "id" | "display_name" | "avatar_url">;
}

export interface ChatRoom {
  id:            string;   // experience id
  title:         string;
  category:      string;
  lastMessage:   string | null;
  lastMessageAt: string | null;
}

// ─────────────────────────────────────────────────────────────
// types/map.ts
// ─────────────────────────────────────────────────────────────
export interface Coordinates {
  latitude:  number;
  longitude: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east:  number;
  west:  number;
}

export interface CameraState extends Coordinates {
  zoom: number;
}

export interface ClusterMarker {
  id:          string;
  title:       string;
  snippet?:    string;
  count:       number;
  isCluster:   boolean;
  category?:   string;
  coordinates: Coordinates;
}

export interface FriendLocation {
  user_id:    string;
  longitude:  number;
  latitude:   number;
  updated_at: string;
  profile:    Pick<Profile, "display_name" | "avatar_url">;
}

// ─────────────────────────────────────────────────────────────
// types/osm.ts
// ─────────────────────────────────────────────────────────────
export interface OSMPlace {
  osm_id:     number;
  name:       string;
  place_type: string;
  longitude:  number;
  latitude:   number;
  address:    string;
  tags:       Record<string, string>;
}