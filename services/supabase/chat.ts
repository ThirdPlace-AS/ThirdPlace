// ─────────────────────────────────────────────────────────────
// services/supabase/chat.ts
// ─────────────────────────────────────────────────────────────
import type { ChatRoom, Message } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./client";

export async function fetchMessages(experienceId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      id, experience_id, sender_id, content, created_at,
      sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)
    `)
    .eq("experience_id", experienceId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(`[Chat] Fetch failed: ${error.message}`);
  return (data ?? []) as Message[];
}

export async function sendMessage(
  experienceId: string,
  content:      string,
): Promise<Message> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("[Chat] Must be authenticated");

  const { data, error } = await supabase
    .from("messages")
    .insert({ experience_id: experienceId, sender_id: user.id, content })
    .select(`
      id, experience_id, sender_id, content, created_at,
      sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)
    `)
    .single();
  if (error) throw new Error(`[Chat] Send failed: ${error.message}`);
  return data as Message;
}

export function subscribeToMessages(
  experienceId: string,
  onMessage:    (msg: Message) => void,
): RealtimeChannel {
  return supabase
    .channel(`chat:${experienceId}`)
    .on(
      "postgres_changes",
      {
        event:  "INSERT",
        schema: "public",
        table:  "messages",
        filter: `experience_id=eq.${experienceId}`,
      },
      async (payload) => {
        const { data: sender } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("id", payload.new.sender_id)
          .single();
        onMessage({ ...(payload.new as Message), sender: sender ?? undefined });
      },
    )
    .subscribe();
}

export async function fetchChatRooms(): Promise<ChatRoom[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("experience_participants")
    .select(`
      experience:experiences(
        id, title, category,
        messages(content, created_at)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: any) => {
      const exp  = row.experience;
      const msgs = Array.isArray(exp?.messages) ? exp.messages : [];
      const last = msgs[msgs.length - 1] ?? null;
      return {
        id:            exp?.id,
        title:         exp?.title,
        category:      exp?.category,
        lastMessage:   last?.content    ?? null,
        lastMessageAt: last?.created_at ?? null,
      } as ChatRoom;
    })
    .filter((r: ChatRoom) => r.id)
    .sort((a: ChatRoom, b: ChatRoom) =>
      (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
    );
}
