// ─────────────────────────────────────────────────────────────
// components/ui/Avatar.tsx
// ─────────────────────────────────────────────────────────────
import { COLOURS } from "@/lib/constants";
import { Image, Text, View } from "react-native";

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  radius?: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const Avatar = React.memo(
  ({ name, imageUrl, size = 40, radius }: AvatarProps) => {
    const borderRadius = radius ?? size * 0.3;
    if (imageUrl) {
      return (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius }}
        />
      );
    }
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: COLOURS.accentLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: size * 0.35,
            fontWeight: "700",
            color: COLOURS.accent,
          }}
        >
          {getInitials(name)}
        </Text>
      </View>
    );
  },
);
