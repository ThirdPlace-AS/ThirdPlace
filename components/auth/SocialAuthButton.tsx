// ─────────────────────────────────────────────────────────────
// components/auth/SocialAuthButton.tsx
// Unified button for Google / Facebook / Apple social auth.
// ─────────────────────────────────────────────────────────────
import { COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

type Provider = "google" | "facebook" | "apple";

interface SocialAuthButtonProps {
  provider: Provider;
  onPress: () => void;
  isLoading?: boolean;
}

const PROVIDER_META: Record<
  Provider,
  { label: string; icon: string; bg: string; textColor: string }
> = {
  google: {
    label: "Continue with Google",
    icon: "logo-google",
    bg: COLOURS.white,
    textColor: COLOURS.textPrimary,
  },
  facebook: {
    label: "Continue with Facebook",
    icon: "logo-facebook",
    bg: "#1877F2",
    textColor: "#FFFFFF",
  },
  apple: {
    label: "Continue with Apple",
    icon: "logo-apple",
    bg: "#000000",
    textColor: "#FFFFFF",
  },
};

export const SocialAuthButton = React.memo(
  ({ provider, onPress, isLoading = false }: SocialAuthButtonProps) => {
    const meta = PROVIDER_META[provider];
    const isWhite = meta.bg === COLOURS.white;

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.88}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          backgroundColor: meta.bg,
          borderRadius: 14,
          paddingVertical: 14,
          borderWidth: isWhite ? 1.5 : 0,
          borderColor: COLOURS.border,
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={meta.textColor} />
        ) : (
          <>
            <Ionicons
              name={meta.icon as any}
              size={20}
              color={meta.textColor}
            />
            <Text
              style={{ fontWeight: "600", fontSize: 15, color: meta.textColor }}
            >
              {meta.label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  },
);
