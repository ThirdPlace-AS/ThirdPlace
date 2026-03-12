// ============================================================
// hooks/useExperienceDetail.ts
//
// Owns all data for the experience detail sheet:
//   - The full Experience row + live participant count
//   - Whether the current user has already joined
//   - Optimistic join/leave so the button responds instantly
//   - Participant profile list for the avatar row
//
// OPTIMISTIC JOIN PATTERN:
//   1. User taps Join → local state flips immediately (feels instant)
//   2. DB call fires in background
//   3. On success → participant_count increments from server refresh
//   4. On failure → local state rolls back + error shown
//
// This is the same pattern used by every social app. The DB
// roundtrip (150–300ms to eu-west-1) is invisible to the user.
// ============================================================

import { supabase } from "@/services/supabase/client";
import {
    fetchExperienceById,
    joinExperience,
    leaveExperience,
} from "@/services/supabase/experiences";
import type { Experience } from "@/types/experience";
import { useCallback, useEffect, useState } from "react";

// Participant as shown in the avatar row — minimal shape
export interface Participant {
  user_id:      string;
  display_name: string;
  avatar_url:   string | null;
}

interface UseExperienceDetailState {
  experience:       Experience | null;
  participants:     Participant[];
  isLoading:        boolean;
  isJoining:        boolean;   // True while the join/leave DB call is in flight
  hasJoined:        boolean;   // Whether the current user is a participant
  isFull:           boolean;   // True when participant_count >= max_participants
  error:            string | null;
}

interface UseExperienceDetailActions {
  toggleJoin: () => Promise<void>;
  refresh:    () => Promise<void>;
}

export function useExperienceDetail(
  experienceId: string,
): UseExperienceDetailState & UseExperienceDetailActions {
  const [experience,   setExperience]   = useState<Experience | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isJoining,    setIsJoining]    = useState(false);
  const [hasJoined,    setHasJoined]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // ── Load experience + participants ──────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch: experience row and participant list
      const [exp, participantRows, { data: { user } }] = await Promise.all([
        fetchExperienceById(experienceId),
        fetchParticipants(experienceId),
        supabase.auth.getUser(),
      ]);

      setExperience(exp);
      setParticipants(participantRows);

      // Check if current user is already a participant
      if (user) {
        setHasJoined(participantRows.some((p) => p.user_id === user.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load experience");
    } finally {
      setIsLoading(false);
    }
  }, [experienceId]);

  useEffect(() => { void load(); }, [load]);

  // ── Optimistic join / leave ─────────────────────────────────
  const toggleJoin = useCallback(async () => {
    if (!experience) return;
    setIsJoining(true);

    const wasJoined   = hasJoined;
    const prevCount   = experience.participant_count;

    // Optimistic update — flip state immediately
    setHasJoined(!wasJoined);
    setExperience((prev) =>
      prev
        ? { ...prev, participant_count: wasJoined ? prevCount - 1 : prevCount + 1 }
        : prev,
    );

    try {
      if (wasJoined) {
        await leaveExperience(experienceId);
      } else {
        await joinExperience(experienceId);
      }
      // Refresh to get server-confirmed count and participant list
      await load();
    } catch (err) {
      // Rollback on failure
      setHasJoined(wasJoined);
      setExperience((prev) =>
        prev ? { ...prev, participant_count: prevCount } : prev,
      );
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsJoining(false);
    }
  }, [experience, hasJoined, experienceId, load]);

  const isFull =
    experience?.max_participants != null &&
    experience.participant_count >= experience.max_participants;

  return {
    experience,
    participants,
    isLoading,
    isJoining,
    hasJoined,
    isFull,
    error,
    toggleJoin,
    refresh: load,
  };
}

// ── Helper: fetch participant profiles ─────────────────────────
// Joins experience_participants with profiles to get display info.
// We only fetch the first 12 — enough to render the avatar row.
// The "+N more" label handles the overflow case.
async function fetchParticipants(experienceId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("experience_participants")
    .select(`
      user_id,
      profile:profiles!user_id (
        display_name,
        avatar_url
      )
    `)
    .eq("experience_id", experienceId)
    .limit(12);

  if (error) return [];

  return (data ?? []).map((row: any) => ({
    user_id:      row.user_id,
    display_name: row.profile?.display_name ?? "Explorer",
    avatar_url:   row.profile?.avatar_url   ?? null,
  }));
}