// app/(app)/_layout.tsx
// Tab bar navigator for all authenticated (and guest) screens.
// Expo Router requires this as a separate file in the route group.
// Lock badges on Chat / Create / Profile tabs for guest users.
import { useGuest } from "@/context/GuestContext";
import { COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

// ─── Tab icon with optional lock badge ───────────────────────
// The badge signals to guests that the tab has restricted actions.
// It does NOT block navigation — GuestGate inside each screen
// intercepts individual actions. This is intentional: we want
// guests to SEE what they're missing (curiosity → conversion).
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
            top: -3,
            right: -5,
            width: 13,
            height: 13,
            borderRadius: 7,
            backgroundColor: "#EF4444",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: COLOURS.white,
          }}
        >
          <Text style={{ fontSize: 6, color: "#fff", lineHeight: 8 }}>🔒</Text>
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
      {/* Detail screens — hidden from tab bar, navigated to programmatically */}
      <Tabs.Screen name="map/[experienceId]" options={{ href: null }} />
      <Tabs.Screen name="chat/[roomId]" options={{ href: null }} />
    </Tabs>
  );
}
