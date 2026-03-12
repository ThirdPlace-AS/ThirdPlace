// ─────────────────────────────────────────────────────────────
// app/(app)/profile/index.tsx  — Profile screen
// ─────────────────────────────────────────────────────────────
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { COLOURS } from "@/lib/constants";
import {
  fetchParticipantCounts,
  fetchProfile,
} from "@/services/supabase/users"; // re-uses the file
import type { Profile } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const MENU_ITEMS = [
  { icon: "person-outline", label: "Edit profile" },
  { icon: "notifications-outline", label: "Notifications" },
  { icon: "lock-closed-outline", label: "Privacy" },
  { icon: "help-circle-outline", label: "Help & feedback" },
  { icon: "information-circle-outline", label: "About ThirdPlace" },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [joinedCount, setJoinedCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, counts] = await Promise.all([
        fetchProfile(user.id),
        fetchParticipantCounts(user.id),
      ]);
      setProfile(p as Profile);
      setJoinedCount(counts.joinedCount);
      setCreatedCount(counts.createdCount);
    })();
  }, [user]);

  const handleSignOut = () =>
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);

  const displayName =
    profile?.display_name ??
    user?.user_metadata?.full_name ??
    "ThirdPlace user";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{
            margin: 16,
            backgroundColor: COLOURS.white,
            borderRadius: 24,
            padding: 24,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
            alignItems: "center",
          }}
        >
          <Avatar
            name={displayName}
            imageUrl={profile?.avatar_url}
            size={80}
            radius={28}
          />
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: COLOURS.textPrimary,
              letterSpacing: -0.5,
              marginTop: 16,
            }}
          >
            {displayName}
          </Text>
          {user?.email && (
            <Text
              style={{
                fontSize: 14,
                color: COLOURS.textSecondary,
                marginTop: 4,
              }}
            >
              {user.email}
            </Text>
          )}
          {profile?.bio && (
            <Text
              style={{
                fontSize: 14,
                color: COLOURS.textSecondary,
                textAlign: "center",
                marginTop: 10,
                lineHeight: 20,
              }}
            >
              {profile.bio}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              width: "100%",
              marginTop: 20,
              paddingTop: 20,
              borderTopWidth: 1,
              borderTopColor: COLOURS.border,
            }}
          >
            {[
              { value: joinedCount, label: "Joined" },
              { value: createdCount, label: "Created" },
            ].map(({ value, label }) => (
              <View key={label} style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: "800",
                    color: COLOURS.textPrimary,
                  }}
                >
                  {value}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLOURS.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: COLOURS.white,
            borderRadius: 20,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {MENU_ITEMS.map(({ icon, label }, i) => (
            <TouchableOpacity
              key={label}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 16,
                gap: 14,
                borderBottomWidth: i < MENU_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: COLOURS.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: COLOURS.accentLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={icon as any} size={18} color={COLOURS.accent} />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: COLOURS.textPrimary,
                  fontWeight: "500",
                }}
              >
                {label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLOURS.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.8}
          style={{
            margin: 16,
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: COLOURS.errorLight,
            borderRadius: 18,
            paddingVertical: 16,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={COLOURS.error} />
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: COLOURS.error }}
          >
            Sign out
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            color: COLOURS.textTertiary,
            marginBottom: 32,
          }}
        >
          ThirdPlace · Member since{" "}
          {profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })
            : "…"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
