// ─────────────────────────────────────────────────────────────
// hooks/useSwipeDeck.ts
// State machine for the discover swipe deck.
// Owns the deck queue, seen-set, and join/pass actions.
// Animation values live in SwipeCard.tsx — this hook only
// manages which cards are visible and what happens on action.
// ─────────────────────────────────────────────────────────────
import { MAP_CONFIG, SWIPE } from "@/lib/constants";
import { fetchNearbyExperiences, joinExperience } from "@/services/supabase/experiences";
import type { Experience } from "@/types/experience";
import * as ExpoLocation from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
 
interface SwipeDeckState {
  deck:       Experience[];
  isLoading:  boolean;
  joinedId:   string | null;    // ID of the last joined experience (for toast)
  detailExp:  Experience | null; // Experience to show in expanded detail sheet
}
 
interface SwipeDeckActions {
  swipeLeft:      () => void;
  swipeRight:     () => void;
  openDetail:     () => void;
  closeDetail:    () => void;
  joinFromDetail: () => Promise<void>;
}
 
export function useSwipeDeck(): SwipeDeckState & SwipeDeckActions {
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [joinedId,       setJoinedId]       = useState<string | null>(null);
  const [detailExp,      setDetailExp]      = useState<Experience | null>(null);
  const seenIds = useRef(new Set<string>());
 
  useEffect(() => {
    (async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        let lat: number = MAP_CONFIG.DEFAULT_LAT;
        let lng: number = MAP_CONFIG.DEFAULT_LNG;
        if (status === "granted") {
          const loc = await ExpoLocation.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
        setAllExperiences(await fetchNearbyExperiences(lng, lat, SWIPE.FETCH_RADIUS));
      } catch { /* keep empty state */ }
      setIsLoading(false);
    })();
  }, []);
 
  // The visible deck: unseen experiences, capped at DECK_SIZE for rendering
  const deck = allExperiences
    .filter((e) => !seenIds.current.has(e.id))
    .slice(0, 10);
 
  const swipeLeft = useCallback(() => {
    setAllExperiences((prev) => {
      if (prev[0]) seenIds.current.add(prev[0].id);
      return prev.slice(1);
    });
  }, []);
 
  const swipeRight = useCallback(async () => {
    const top = allExperiences[0];
    if (!top) return;
    seenIds.current.add(top.id);
    setJoinedId(top.id);
    setAllExperiences((prev) => prev.slice(1));
    try { await joinExperience(top.id); } catch { /* 23505 = already joined, ok */ }
    setTimeout(() => setJoinedId(null), 2_000);
  }, [allExperiences]);
 
  const openDetail  = useCallback(() => setDetailExp(allExperiences[0] ?? null), [allExperiences]);
  const closeDetail = useCallback(() => setDetailExp(null), []);
 
  const joinFromDetail = useCallback(async () => {
    if (!detailExp) return;
    seenIds.current.add(detailExp.id);
    setAllExperiences((prev) => prev.filter((e) => e.id !== detailExp.id));
    setDetailExp(null);
    try { await joinExperience(detailExp.id); } catch { /* ok */ }
  }, [detailExp]);
 
  return { deck, isLoading, joinedId, detailExp, swipeLeft, swipeRight, openDetail, closeDetail, joinFromDetail };
}
