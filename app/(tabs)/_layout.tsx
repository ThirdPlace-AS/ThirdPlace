import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import "../../global.css";

export default function TabsLayout() {
  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        tabBarActiveTintColor: "#f54900",
        headerStyle: { backgroundColor: "#0f172b" },
        headerShadowVisible: false,
        headerTintColor: "#f54900",
        tabBarStyle: { backgroundColor: "#0f172b" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Map",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "map-sharp" : "map-outline"}
              size={30}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{
          headerTitle: "Swipe",
          title: "Swipe",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "albums" : "albums-outline"}
              size={30}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="myExperience"
        options={{
          headerTitle: "MyExperience",
          title: "MyExperience",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "add-circle-sharp" : "add-circle-outline"}
              size={30}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          headerTitle: "Chat",
          title: "Chat",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "chatbubbles-sharp" : "chatbubbles-outline"}
              size={30}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: "Profile",
          title: "Profile",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person-circle-sharp" : "person-circle-outline"}
              size={30}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
