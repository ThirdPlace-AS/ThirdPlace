// ─────────────────────────────────────────────────────────────
// hooks/useChat.ts
// ─────────────────────────────────────────────────────────────
import {
  fetchChatRooms,
  fetchMessages,
  sendMessage as sendMessageService,
  subscribeToMessages,
} from "@/services/supabase/chat";
import type { ChatRoom, Message } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
 
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
 