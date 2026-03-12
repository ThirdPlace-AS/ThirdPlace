// ─────────────────────────────────────────────────────────────
// app/(app)/chat/index.tsx  — Chat list
// ─────────────────────────────────────────────────────────────
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { useChatList } from "@/hooks/useChat";
import { CATEGORY_META, COLOURS } from "@/lib/constants";
import type { ChatRoom } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: COLOURS.accentLight,
              alignItems: "center",
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
