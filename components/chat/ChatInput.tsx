// ─────────────────────────────────────────────────────────────
// components/chat/ChatInput.tsx
// Animated input bar. Send button pulses in when text is present.
// ─────────────────────────────────────────────────────────────
import React from "react";
import { ANIMATION, COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Platform,
  TextInputBase,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface ChatInputProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  isSending?: boolean;
  disabled?: boolean;
}

export const ChatInput = React.memo(
  ({
    value,
    onChange,
    onSend,
    isSending = false,
    disabled = false,
  }: ChatInputProps) => {
    const sendScale = useSharedValue(value.trim() ? 1 : 0.7);

    // Animate send button scale when text appears/disappears
    React.useEffect(() => {
      sendScale.value = withSpring(value.trim() ? 1 : 0.7, ANIMATION.spring);
    }, [!!value.trim()]);

    const sendStyle = useAnimatedStyle(() => ({
      transform: [{ scale: sendScale.value }],
      opacity: sendScale.value,
    }));

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 12,
          paddingVertical: 10,
          paddingBottom: Platform.OS === "ios" ? 24 : 12,
          backgroundColor: COLOURS.white,
          borderTopWidth: 1,
          borderTopColor: COLOURS.border,
          gap: 10,
        }}
      >
        <TextInputBase
          style={{
            flex: 1,
            backgroundColor: COLOURS.surfaceAlt,
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 15,
            color: COLOURS.textPrimary,
            maxHeight: 120,
            borderWidth: 1.5,
            borderColor: value ? COLOURS.borderFocus : COLOURS.border,
          }}
          placeholder="Message…"
          placeholderTextColor={COLOURS.textTertiary}
          value={value}
          onChangeText={onChange}
          multiline
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={onSend}
          blurOnSubmit={false}
        />

        <Animated.View style={sendStyle}>
          <TouchableOpacity
            onPress={onSend}
            disabled={!value.trim() || isSending || disabled}
            activeOpacity={0.8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: value.trim()
                ? COLOURS.accent
                : COLOURS.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={COLOURS.white} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={value.trim() ? COLOURS.white : COLOURS.textTertiary}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  },
);
