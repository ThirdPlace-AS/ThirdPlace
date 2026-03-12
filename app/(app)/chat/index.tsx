// ─────────────────────────────────────────────────────────────
// app/(app)/chat/index.tsx  — Chat list
// ─────────────────────────────────────────────────────────────
import React from "react";
import {, KeyboardAvoidingView, Platform 
  ActivityIndica, useLocalSearchParams tor,
  FlatList,
  Text,
  TouchableOpacity,, useChatRoom 
  View,
} from "react-native";
import { router } from "expo-routerpes";


// ─────────────────────────────────────────────────────────────
// app/(app)/chat/[roomId].tsx  — Chat room
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";



import { supabase }    from "@/services/supabase/client";
import { MessageBubble , ChatIn"ut } from "@/components/chat/M;sageBubble
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useChatList } from "@/hooks/useChat";
import { COLOURS, CATEGORY_META } from "@/lib/constants";
import { ErrorFallback } from "@/components/ui";
import type { ChatRoom } from "@/types";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso),
    diff = Date.now() - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ChatListScreen() {
  const { rooms, isLoading, error } = useChatList();

  if (isLoading)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLOURS.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLOURS.accent} />
      </SafeAreaView>
    );

  if (error) return <ErrorFallback message={error} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.background }}>
      <View
        style={{
          backgroundColor: COLOURS.white,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: COLOURS.border,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: COLOURS.textPrimary,
            letterSpacing: -0.8,
          }}
        >
          Messages
        </Text>
        <Text
          style={{ fontSize: 14, color: COLOURS.textSecondary, marginTop: 2 }}
        >
          Your active group chats
        </Text>
      </View>

      {rooms.length === 0 ? (
        <View
          style={{
             justifyContent: "center",

              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={36}
              color={COLOURS.accent}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: COLOURS.textPrimary,
              textAlign: "center",
            }}
          >
            No chats yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: COLOURS.textSecondary,
              textAlign: "center",
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            Join an experience on the map to start chatting.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                backgroundColor: COLOURS.border,
                marginLeft: 76,
              }}
            />
          )}
          renderItem={({ item }: { item: ChatRoom }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(app)/chat/[roomId]",
                  params: { roomId: item.id },
                })
              }
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: COLOURS.white,
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: COLOURS.accentLight,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Ionicons
                  name={
                    (CATEGORY_META[item.category]?.icon ??
                      "star-outline") as any
                  }
                  size={24}
                  color={COLOURS.accent}
                />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: COLOURS.textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLOURS.textTertiary }}>
                    {formatTime(item.lastMessageAt)}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 14, color: COLOURS.textSecondary }}
                  numberOfLines={1}
                >
                  {item.lastMessage ?? "No messages yet"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// app/(app)/chat/[roomId].tsx  — Chat room
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useChatRoom } from "@/hooks/useChat";
import { supabase } from "@/services/supabase/client";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/MessageBubble";

export function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { messages, isLoading, isSending, error, isConnected, sendMessage } =
    useChatRoom(roomId ?? null);
  const [draft, setDraft] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [title, setTitle] = useState("Chat");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => setMyId(user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!roomId) return;
    supabase
      .from("experiences")
      .select("title")
      .eq("id", roomId)
      .single()
      .then(({ data }) => {
        if (data?.title) setTitle(data.title);
      });
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLOURS.background }}
      edges={["top"]}
    >
      {/* Header */}
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLOURS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: COLOURS.textPrimary,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginTop: 1,
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: isConnected ? COLOURS.success : COLOURS.error,
              }}
            />
            <Text style={{ fontSize: 12, color: COLOURS.textSecondary }}>
              {isConnected ? "Live" : "Reconnecting…"}
            </Text>
          </View>
        </View>
      </View>

      {!isConnected && (
        <View
          style={{
            backgroundColor: COLOURS.errorLight,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="wifi-outline" size={16} color={COLOURS.error} />
          <Text style={{ fontSize: 13, color: COLOURS.error }}>
            Connection lost — will resync when reconnected
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {isLoading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={COLOURS.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                isOwn={
                  item.sender_id === myId || item.id.startsWith("optimistic:")
                }
                showName={item.sender_id !== messages[index - 1]?.sender_id}
              />
            )}
            ListEmptyComponent={() => (
              <View style={{ alignItems: "center", paddingTop: 60, gap: 8 }}>
                <Ionicons
                  name="chatbubble-outline"
                  size={40}
                  color={COLOURS.textTertiary}
                />
                <Text style={{ color: COLOURS.textTertiary, fontSize: 15 }}>
                  No messages yet. Say hello!
                </Text>
              </View>
            )}
          />
        )}
        {error && (
          <View
            style={{
              margin: 16,
              backgroundColor: COLOURS.errorLight,
              borderRadius: 10,
              padding: 10,
            }}
          >
            <Text style={{ color: COLOURS.error, fontSize: 13 }}>{error}</Text>
          </View>
        )}
        <ChatInput
          value={draft}
          onChange={setDraft}
          onSend={handleSend}
          isSending={isSending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ChatRoomScreen;
