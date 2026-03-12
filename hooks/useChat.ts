// ─────────────────────────────────────────────────────────────
// hooks/useChat.ts
// ─────────────────────────────────────────────────────────────
import {
  fetchChatRooms,
  fetchMessages,
  sendMessage as sendMessageService,
  subscribeFriendLocations,
  subscribeToMessages,
  upsertMyLocation
} from "@/services/supabase/chat";
import type { ChatRoom, Experience, FriendLocation, Message } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";


// ─────────────────────────────────────────────────────────────
// hooks/useFriendLocations.ts
// Opt-in friend location sharing.
// Sharing toggle → pushes GPS updates to Supabase every 50m.
// Always subscribes to friends' locations via Realtime (RLS
// enforces mutual friendship at the DB level).
// ─────────────────────────────────────────────────────────────
import * as ExpoLocation from "expo-location";




// ─────────────────────────────────────────────────────────────
// hooks/useSwipeDeck.ts
// State machine for the discover swipe deck.
// Owns the deck queue, seen-set, and join/pass actions.
// Animation values live in SwipeCard.tsx — this hook only
// manages which cards are visible and what happens on action.
// ─────────────────────────────────────────────────────────────
import { MAP_CONFIG, SWIPE } from "@/lib/constants";
import { fetchNearbyExperiences, joinExperience } from "@/services/supabase/experiences";


// ── Chat room hook ────────────────────────────────────────────
export function useChatRoom(experienceId: string | null) {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [isSending,   setIsSending]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const load = useCallback(async () => {
    if (!experienceId) return;
    setIsLoading(true);
    setError(null);
    try {
      setMessages(await fetchMessages(experienceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [experienceId]);

  useEffect(() => {
    if (!experienceId) return;
    void load();

    channelRef.current = subscribeToMessages(experienceId, (newMsg) => {
      setMessages((prev) => {
        // Deduplicate against optimistic messages
        const isDupe = prev.some(
          (m) => m.id === newMsg.id ||
            (m.id.startsWith("optimistic:") &&
             m.content === newMsg.content &&
             m.sender_id === newMsg.sender_id),
        );
        if (isDupe) {
          return prev.map((m) =>
            m.id.startsWith("optimistic:") && m.content === newMsg.content
              ? newMsg : m,
          );
        }
        return [...prev, newMsg];
      });
    });

    channelRef.current.on("system" as any, {}, (status: any) => {
      setIsConnected(status?.status === "ok" || status?.status === "subscribed");
    });

    return () => { channelRef.current?.unsubscribe(); };
  }, [experienceId, load]);

  const sendMessage = useCallback(async (content: string) => {
    if (!experienceId || !content.trim()) return;
    setIsSending(true);

    const optimistic: Message = {
      id:            `optimistic:${Date.now()}`,
      experience_id: experienceId,
      sender_id:     "me",
      content:       content.trim(),
      created_at:    new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendMessageService(experienceId, content.trim());
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setIsSending(false);
    }
  }, [experienceId]);

  return { messages, isLoading, isSending, error, isConnected, sendMessage, reload: load };
}

// ── Chat list hook ────────────────────────────────────────────
export function useChatList() {
  const [rooms,     setRooms]     = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRooms(await fetchChatRooms());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load chats");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { rooms, isLoading, error };
}

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
        let lat = MAP_CONFIG.DEFAULT_LAT;
        let lng = MAP_CONFIG.DEFAULT_LNG;
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