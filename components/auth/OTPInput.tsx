// ─────────────────────────────────────────────────────────────
// components/auth/OTPInput.tsx
// 6-box OTP digit input. Auto-advances focus, auto-submits on fill.
// ─────────────────────────────────────────────────────────────
import React, { useRef } from "react";
import { COLOURS } from "@/lib/constants";
import { TextInput, View } from "react-native";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
}

export const OTPInput = React.memo(
  ({ value, onChange, onComplete, length = 6 }: OTPInputProps) => {
    const inputs = useRef<(TextInput | null)[]>([]);
    const digits = value
      .split("")
      .concat(Array(length).fill(""))
      .slice(0, length);

    const handleChange = (text: string, index: number) => {
      const clean = text.replace(/\D/g, "").slice(-1);
      const next = [...digits];
      next[index] = clean;
      const newVal = next.join("");
      onChange(newVal);
      if (clean && index < length - 1) inputs.current[index + 1]?.focus();
      if (newVal.length === length) onComplete?.(newVal);
    };

    const handleKeyPress = (key: string, index: number) => {
      if (key === "Backspace" && !digits[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    };

    return (
      <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
        {digits.map((digit, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              inputs.current[i] = r;
            }}
            style={{
              width: 48,
              height: 56,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: digit ? COLOURS.accent : COLOURS.border,
              backgroundColor: digit ? COLOURS.accentLight : COLOURS.surfaceAlt,
              textAlign: "center",
              fontSize: 22,
              fontWeight: "700",
              color: COLOURS.textPrimary,
            }}
            value={digit}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>
    );
  },
);
