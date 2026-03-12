// ─────────────────────────────────────────────────────────────
// components/chat/MessageBubble.tsx
// ─────────────────────────────────────────────────────────────
import { Avatar } from "@/components/ui/Avatar";
import { COLOURS } from "@/lib/constants";
import type { Message } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showName: boolean; // Show sender name when they differ from previous message
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const MessageBubble = React.memo(
  ({ message, isOwn, showName }: MessageBubbleProps) => {
    const isOptimistic = message.id.startsWith("optimistic:");

    return (
      <View
        style={{
          alignItems: isOwn ? "flex-end" : "flex-start",
          marginVertical: 2,
          paddingHorizontal: 16,
        }}
      >
        {!isOwn && showName && message.sender?.display_name && (
          <Text
            style={{
              fontSize: 12,
              color: COLOURS.textTertiary,
              marginLeft: 44,
              marginBottom: 3,
            }}
          >
            {message.sender.display_name}
          </Text>
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            maxWidth: "80%",
          }}
        >
          {!isOwn && (
            <Avatar
              name={message.sender?.display_name ?? "?"}
              imageUrl={message.sender?.avatar_url}
              size={32}
              radius={10}
            />
          )}

          <View>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 18,
                borderBottomRightRadius: isOwn ? 4 : 18,
                borderBottomLeftRadius: isOwn ? 18 : 4,
                backgroundColor: isOwn ? COLOURS.accent : COLOURS.white,
                shadowColor: isOwn ? "transparent" : "#000",
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: isOwn ? 0 : 2,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: isOwn ? COLOURS.white : COLOURS.textPrimary,
                  lineHeight: 21,
                }}
              >
                {message.content}
              </Text>
            </View>

            {/* Timestamp + delivery indicator */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: isOwn ? "flex-end" : "flex-start",
                marginTop: 3,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: COLOURS.textTertiary }}>
                {formatTime(message.created_at)}
              </Text>
              {isOwn && (
                <Ionicons
                  name={isOptimistic ? "checkmark" : "checkmark-done"}
                  size={13}
                  color={isOptimistic ? COLOURS.textTertiary : COLOURS.accent}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  },
);
