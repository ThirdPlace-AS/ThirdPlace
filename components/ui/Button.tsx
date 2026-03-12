// ─────────────────────────────────────────────────────────────
// components/ui/Button.tsx
// ─────────────────────────────────────────────────────────────
import { COLOURS } from "@/lib/constants";
import React from "react";
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    type TouchableOpacityProps,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

const VARIANT_STYLES = {
  primary: { bg: COLOURS.accent, text: COLOURS.white, border: "transparent" },
  secondary: {
    bg: COLOURS.white,
    text: COLOURS.textPrimary,
    border: COLOURS.border,
  },
  ghost: { bg: "transparent", text: COLOURS.accent, border: "transparent" },
  danger: {
    bg: COLOURS.errorLight,
    text: COLOURS.error,
    border: "transparent",
  },
};

const SIZE_STYLES = {
  sm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    borderRadius: 12,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 16,
    borderRadius: 14,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    fontSize: 17,
    borderRadius: 18,
  },
};

export const Button = React.memo(
  ({
    label,
    variant = "primary",
    isLoading = false,
    size = "md",
    disabled,
    style,
    ...rest
  }: ButtonProps) => {
    const v = VARIANT_STYLES[variant];
    const s = SIZE_STYLES[size];
    const isDisabled = disabled || isLoading;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        disabled={isDisabled}
        style={[
          {
            backgroundColor: v.bg,
            borderRadius: s.borderRadius,
            paddingVertical: s.paddingVertical,
            paddingHorizontal: s.paddingHorizontal,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: v.border !== "transparent" ? 1.5 : 0,
            borderColor: v.border,
            opacity: isDisabled ? 0.5 : 1,
          },
          style,
        ]}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={v.text} />
        ) : (
          <Text
            style={{ color: v.text, fontSize: s.fontSize, fontWeight: "700" }}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  },
);
