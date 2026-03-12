// ─────────────────────────────────────────────────────────────
// components/ui/ErrorFallback.tsx
// ─────────────────────────────────────────────────────────────
import { COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface ErrorFallbackProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorFallback = React.memo(
  ({ message, onRetry }: ErrorFallbackProps) => (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: COLOURS.errorLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="warning-outline" size={32} color={COLOURS.error} />
      </View>
      <Text
        style={{
          fontSize: 16,
          color: COLOURS.textSecondary,
          textAlign: "center",
          lineHeight: 24,
        }}
      >
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={{
            backgroundColor: COLOURS.accentLight,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: COLOURS.accent, fontWeight: "700" }}>
            Try again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  ),
);
