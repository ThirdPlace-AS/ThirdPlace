// ─────────────────────────────────────────────────────────────
// app/(app)/chat/[roomId].tsx  — Chat room
// ─────────────────────────────────────────────────────────────
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { useChatRoom } from "@/hooks/useChat";
import { COLOURS } from "@/lib/constants";
import { supabase } from "@/services/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
