// ─────────────────────────────────────────────────────────────
// app/(app)/_layout.tsx  — Bottom tab navigator
// ─────────────────────────────────────────────────────────────
import { useGuest } from "@/context/GuestContext";
import { COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";

// Tab icon with an optional small lock badge for guest-restricted tabs.
// The badge uses a tiny red dot with a lock emoji — unmistakable but
// non-intrusive. It doesn't block tapping; GuestGate handles that inside
// the screen itself.
function TabIcon({
  name,
  color,
  size,
  locked = false,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  size: number;
  locked?: boolean;
}) {
  return (
    <View style={{ position: "relative" }}>
      <Ionicons name={name} size={size} color={color} />
      {locked && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            backgroundColor: "#EF4444",
            borderRadius: 8,
            width: 14,
            height: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: COLOURS.white,
          }}
        >
          <Text style={{ fontSize: 7, color: "#fff" }}>🔒</Text>
        </View>
      )}
    </View>
  );
}

export default function AppLayout() {
  const { isGuest } = useGuest();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLOURS.accent,
        tabBarInactiveTintColor: COLOURS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLOURS.white,
          borderTopColor: COLOURS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="map/index"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="map-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover/index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="layers-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="create/index"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              name="add-circle-outline"
              color={color}
              size={size + 4}
              // Guests CAN tap create but GuestGate triggers immediately inside
              locked={isGuest}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              name="chatbubbles-outline"
              color={color}
              size={size}
              locked={isGuest}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              name="person-outline"
              color={color}
              size={size}
              locked={isGuest}
            />
          ),
        }}
      />
      {/* Hide detail screens from tab bar */}
      <Tabs.Screen name="map/[experienceId]" options={{ href: null }} />
      <Tabs.Screen name="chat/[roomId]" options={{ href: null }} />
    </Tabs>
  );
}
