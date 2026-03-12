// ─────────────────────────────────────────────────────────────
// components/ui/Tag.tsx
// Category badge — used on cards, list rows, and detail sheets.
// ─────────────────────────────────────────────────────────────
import { CATEGORY_META, COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface TagProps {
  category: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export const Tag = React.memo(
  ({ category, showIcon = true, size = "md" }: TagProps) => {
    const meta = CATEGORY_META[category] ?? {
      icon: "star-outline",
      label: category,
      colors: [COLOURS.accentLight, COLOURS.accent],
    };
    const small = size === "sm";

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: small ? 4 : 6,
          paddingHorizontal: small ? 8 : 10,
          paddingVertical: small ? 3 : 5,
          backgroundColor: COLOURS.accentLight,
          borderRadius: 20,
        }}
      >
        {showIcon && (
          <Ionicons
            name={meta.icon as any}
            size={small ? 12 : 14}
            color={COLOURS.accent}
          />
        )}
        <Text
          style={{
            fontSize: small ? 11 : 13,
            fontWeight: "600",
            color: COLOURS.accent,
          }}
        >
          {meta.label}
        </Text>
      </View>
    );
  },
);
