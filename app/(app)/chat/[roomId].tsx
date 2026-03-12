// ============================================================
// app/(app)/chat/[roomId].tsx
//
// The individual chat room screen for an experience group chat.
// roomId = experienceId — one chat room per experience.
//
// ARCHITECTURE:
//   - useChatRoom() owns all message state + Realtime subscription
//   - FlatList renders messages with inverted={false} and
//     autoscroll to bottom on new messages via scrollToEnd()
//   - ChatInput handles text composition + send
//   - Connection status banner shows when the WebSocket drops
//
// KEYBOARD HANDLING:
//   KeyboardAvoidingView pushes the input up when the keyboard
//   appears. On iOS we use "padding" behaviour; on Android we
//   rely on the window resize (the default). This is the most
//   reliable cross-platform approach — react-native-keyboard-
//   aware-scroll-view is an alternative if you need scroll-to-
//   focused-input behaviour (not needed here since the input
//   is always at the bottom).
//
// PERFORMANCE:
//   MessageBubble is wrapped in React.memo so only changed
//   messages re-render. The keyExtractor uses message.id.
//   FlatList's getItemLayout is NOT used here because message
//   heights are variable (multi-line text). At MVP scale
//   (< 200 messages) this is fine. Add getItemLayout + fixed
//   heights if you hit jank with 500+ message histories.
//
// GUEST GATE:
//   This screen is only reachable if the user is authenticated
//   (guests are intercepted by the Chat tab) but we guard
//   the send action anyway as a safety net.
// ============================================================

import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { useAuth } from "@/hooks/useAuth";
import { useChatRoom } from "@/hooks/useChat";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLOURS } from "@/lib/constants";
import type { Message } from "@/types";

// ─── Connection status banner ────────────────────────────────
// Appears at the top of the message list when the WebSocket
// drops. Auto-hides when reconnected.
function ConnectionBanner({
  status,
}: {
  status: "connecting" | "reconnecting" | "error" | "ok";
}) {
  if (status === "ok") return null;

  const config = {
    connecting: {
      color: COLOURS.warning,
      text: "Connecting…",
      icon: "wifi-outline",
    },
    reconnecting: {
      color: COLOURS.warning,
      text: "Reconnecting…",
      icon: "wifi-outline",
    },
    error: {
      color: COLOURS.error,
      text: "Connection lost",
      icon: "alert-circle-outline",
    },
  }[status];

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        backgroundColor: config.color + "22", // 13% opacity
        borderBottomWidth: 1,
        borderBottomColor: config.color + "33",
      }}
    >
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={{ fontSize: 12, color: config.color, fontWeight: "600" }}>
        {config.text}
      </Text>
    </Animated.View>
  );
}

// ─── Date separator ──────────────────────────────────────────
// Appears between messages when the day changes.
function DateSeparator({ date }: { date: string }) {
  const label = (() => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  })();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: COLOURS.border }} />
      <Text
        style={{
          fontSize: 11,
          color: COLOURS.textTertiary,
          paddingHorizontal: 10,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: COLOURS.border }} />
    </View>
  );
}

// ─── Message list item ────────────────────────────────────────
// Decides whether to show a date separator above this message,
// and whether to show the sender's name (groups consecutive
// messages from the same sender under one avatar).
interface MessageItemProps {
  message: Message;
  prevMessage: Message | null;
  currentUserId: string;
}

function MessageItem({
  message,
  prevMessage,
  currentUserId,
}: MessageItemProps) {
  const isOwn =
    message.sender_id === currentUserId || message.sender_id === "me"; // "me" is the optimistic placeholder

  // Show sender name if this is the first message in a group from this sender
  const showName =
    !isOwn && (!prevMessage || prevMessage.sender_id !== message.sender_id);

  // Show date separator if day has changed since the previous message
  const showDateSeparator = (() => {
    if (!prevMessage) return true; // First message always gets a date
    const prev = new Date(prevMessage.created_at).toDateString();
    const curr = new Date(message.created_at).toDateString();
    return prev !== curr;
  })();

  return (
    <>
      {showDateSeparator && <DateSeparator date={message.created_at} />}
      <MessageBubble message={message} isOwn={isOwn} showName={showName} />
    </>
  );
}

// ─── Main chat screen ─────────────────────────────────────────
export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const listRef = useRef<FlatList<Message>>(null);
  const [draft, setDraft] = useState("");

  const {
    messages,
    isLoading,
    isSending,
    error,
    isConnected,
    sendMessage,
  } = useChatRoom(roomId ?? null);
  const experienceName = "Group Chat";

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to let the layout settle before scrolling
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
  }, [draft, sendMessage]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageItem
        key={item.id}
        message={item}
        prevMessage={index > 0 ? messages[index - 1] : null}
        currentUserId={user?.id ?? "me"}
      />
    ),
    [messages, user?.id],
  );

  if (!roomId) {
    router.back();
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLOURS.background }}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header ─────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: COLOURS.white,
            borderBottomWidth: 1,
            borderBottomColor: COLOURS.border,
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={COLOURS.textPrimary}
            />
          </TouchableOpacity>

          {/* Title area */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: COLOURS.textPrimary,
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {experienceName ?? "Group Chat"}
            </Text>
            <Text style={{ fontSize: 12, color: COLOURS.textTertiary }}>
              {messages.length > 0
                ? `${messages.length} messages`
                : "No messages yet"}
            </Text>
          </View>

          {/* Info button */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(app)/map/[experienceId]",
                params: { experienceId: roomId },
              })
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={COLOURS.accent}
            />
          </TouchableOpacity>
        </View>

        {/* ── Connection status ───────────────────────────── */}
        <ConnectionBanner status={isConnected ? "ok" : "reconnecting"} />

        {/* ── Error banner ────────────────────────────────── */}
        {error && (
          <View
            style={{
              backgroundColor: COLOURS.errorLight,
              paddingHorizontal: 16,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="alert-circle" size={14} color={COLOURS.error} />
            <Text style={{ fontSize: 12, color: COLOURS.error, flex: 1 }}>
              {error}
            </Text>
          </View>
        )}

        {/* ── Message list ────────────────────────────────── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {isLoading ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="large" color={COLOURS.accent} />
            </View>
          ) : messages.length === 0 ? (
            // Empty state — first message prompt
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 40,
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: COLOURS.textPrimary,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Start the conversation
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLOURS.textTertiary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Say hello to everyone joining this experience!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              // Don't invert — we scroll to bottom manually.
              // Inverted lists have gesture direction issues with
              // Android's software keyboard.
              inverted={false}
              // Maintain scroll position when new items added at bottom
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: false })
              }
              // Remove default item separator — we handle spacing in MessageBubble
              ItemSeparatorComponent={null}
            />
          )}

          {/* ── Chat input ──────────────────────────────── */}
          <SafeAreaView
            edges={["bottom"]}
            style={{ backgroundColor: COLOURS.white }}
          >
            <ChatInput
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              isSending={isSending}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

