// ─────────────────────────────────────────────────────────────
// app/(auth)/welcome.tsx
// ─────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/Button";
import { COLOURS } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Dimensions, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_H } = Dimensions.get("window");

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.white }}>
      <View
        style={{
          height: SCREEN_H * 0.52,
          backgroundColor: COLOURS.accent,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {[200, 280, 360].map((s, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              width: s,
              height: s,
              borderRadius: s / 2,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          />
        ))}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={{ alignItems: "center" }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 28,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name="location" size={44} color={COLOURS.white} />
          </View>
          <Text
            style={{
              fontSize: 42,
              fontWeight: "800",
              color: COLOURS.white,
              letterSpacing: -1.5,
            }}
          >
            ThirdPlace
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.8)",
              marginTop: 8,
            }}
          >
            Discover where life happens
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.delay(300).duration(500)}
        style={{
          flex: 1,
          paddingHorizontal: 28,
          paddingTop: 40,
          paddingBottom: 24,
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 12 }}>
          {[
            { icon: "map-outline", text: "Find experiences near you" },
            { icon: "people-outline", text: "Meet people who share your vibe" },
            {
              icon: "chatbubbles-outline",
              text: "Group chat for every meetup",
            },
          ].map(({ icon, text }) => (
            <View
              key={text}
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: COLOURS.accentLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={icon as any} size={20} color={COLOURS.accent} />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: COLOURS.textSecondary,
                  fontWeight: "500",
                }}
              >
                {text}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ gap: 12 }}>
          <Button
            label="Get started"
            size="lg"
            onPress={() => router.push("/(auth)/sign-up")}
          />
          <Button
            label="I already have an account"
            size="lg"
            variant="secondary"
            onPress={() => router.push("/(auth)/sign-in")}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
