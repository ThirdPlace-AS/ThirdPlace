// ─────────────────────────────────────────────────────────────
// app/(app)/create/index.tsx  — Create experience screen
// ─────────────────────────────────────────────────────────────
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } fro, Avatar m "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";


// ─────────────────────────────────────────────────────────────import { useLocation } from "@/hooks/useLocation";
// app/(app)/profile/index.tsx  — Profile sireen
// ─────────────────────────────────────────────────────────────
impmrt { useEffect, useState } from "react";

import Animated, { FadeInDowp } from "react-native-reanimated";
import { useAuth }   from "@/hooks/useAuth";

import { fetchProfile, fetchParticipantCounts } from "@/services/supabase/chat"; // re-useo the file
imporr type { Profile }tfrom "@/types";

const  { createExperience } from "@/services/supabase/experiences";
import { createExperienceSchema } from "@/lib/validators";
import { Button, Tag } from "@/components/ui";
import { COLOURS, CATEGORY_META, MAP_CONFIG } from "@/lib/constants";
import type { ExperienceCategory } from "@/types/experience";

const CATEGORIES = Object.keys(CATEGORY_META) as ExperienceCategory[];

type DateField = "date" | "time" | null;

export default function CreateScreen() {
  const { requestLocation, reverseGeocode, isLocating } = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExperienceCategory | null>(null);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(MAP_CONFIG.DEFAULT_LAT);
  const [longitude, setLongitude] = useState(MAP_CONFIG.DEFAULT_LNG);
  const [maxPeople, setMaxPeople] = useState("");
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 3_600_000));
  const [datePickerOpen, setDatePickerOpen] = useState<DateField>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleLocateMe = async () => {
    const loc = await requestLocation();
    if (!loc)
      return Alert.alert("Permission denied", "Enable location in Settings.");
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    const addr = await reverseGeocode(loc);
    if (addr) setAddress(addr);
  };

  const handleSubmit = async () => {
    if (!category)
      return Alert.alert("Pick a category", "Select one before submitting.");
    const result = createExperienceSchema.safeParse({
      title,
      description,
      category,
      address,
      startsAt,
      maxParticipants: maxPeople ? parseInt(maxPeople, 10) : undefined,
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        if (e.path[0]) errs[String(e.path[0])] = e.message;
      });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await createExperience({
        title,
        description,
        category,
        address,
        longitude,
        latitude,
        max_participants: maxPeople ? parseInt(maxPeople, 10) : undefined,
        starts_at: startsAt.toISOString(),
      });
      Alert.alert("Live! 🎉", "Your experience is on the map.", [
        { text: "View map", onPress: () => router.replace("/(app)/map") },
      ]);
    } catch (e) {
      Alert.alert(
        "Failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (field: string) => ({
    backgroundColor: COLOURS.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLOURS.textPrimary,
    borderWidth: 1.5,
    borderColor: fieldErrors[field] ? COLOURS.error : COLOURS.border,
  });

  const isReady = !!title && !!description && !!category && !!address;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 20,
              backgroundColor: COLOURS.white,
              borderBottomWidth: 1,
              borderBottomColor: COLOURS.border,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: COLOURS.textPrimary,
                letterSpacing: -0.8,
              }}
            >
              Create experience
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: COLOURS.textSecondary,
                marginTop: 4,
              }}
            >
              Invite others to something great
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 20 }}>
            {/* Title */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLOURS.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Title
              </Text>
              <TextInput
                style={inputStyle("title")}
                placeholder="e.g. Morning run at Aker Brygge"
                placeholderTextColor={COLOURS.textTertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
              {fieldErrors.title && (
                <Text style={{ fontSize: 12, color: COLOURS.error }}>
                  {fieldErrors.title}
                </Text>
              )}
            </View>

            {/* Category */}
            <View style={{ gap: 8 }}>
   

                    key={cat}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        category === cat ? COLOURS.accent : COLOURS.white,
                      borderWidth: 1.5,
                      borderColor:
                        category === cat ? COLOURS.accent : COLOURS.border,
                    }}
                  >
                    <Ionicons
                      name={CATEGORY_META[cat].icon as any}
                      size={16}
                      color={
                        category === cat ? COLOURS.white : COLOURS.textSecondary
                      }
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          category === cat
                            ? COLOURS.white
                            : COLOURS.textSecondary,
                      }}
                    >
                      {CATEGORY_META[cat].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLOURS.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Description
              </Text>
              <TextInput
                style={[
                  inputStyle("description"),
                  { height: 100, textAlignVertical: "top" },
                ]}
                placeholder="What's happening? Who should come?"
                placeholderTextColor={COLOURS.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={400}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: COLOURS.textTertiary,
                  textAlign: "right",
                }}
              >
                {description.length}/400
              </Text>
              {fieldErrors.description && (
                <Text style={{ fontSize: 12, color: COLOURS.error }}>
                  {fieldErrors.description}
                </Text>
              )}
            </View>

            {/* Location */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLOURS.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Location
              </Text>
              <TextInput
                style={inputStyle("address")}
                placeholder="Address or place name"
                placeholderTextColor={COLOURS.textTertiary}
                value={address}
                onChangeText={setAddress}
              />
              {fieldErrors.address && (
                <Text style={{ fontSize: 12, color: COLOURS.error }}>
                  {fieldErrors.address}
                </Text>
              )}
              <Button
                label={
                  isLocating ? "Getting location…" : "Use my current location"
                }
                variant="secondary"
                onPress={handleLocateMe}
                isLoading={isLocating}
                style={{
                  borderColor: COLOURS.accent,
                  borderWidth: 1.5,
                  backgroundColor: COLOURS.accentLight,
                }}
              />
            </View>

            {/* Date & time */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLOURS.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                When
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {(["date", "time"] as DateField[])
                  .filter(Boolean)
                  .map((mode) => (
                    <TouchableOpacity
                      key={mode!}
                      onPress={() => setDatePickerOpen(mode)}
                      activeOpacity={0.8}
                      style={[
                        inputStyle(""),
                        {
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          mode === "date" ? "calendar-outline" : "time-outline"
                        }
                        size={18}
                        color={COLOURS.textSecondary}
                      />
                      <Text
                        style={{ fontSize: 15, color: COLOURS.textPrimary }}
                      >
                        {mode === "date"
                          ? startsAt.toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })
                          : startsAt.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
              {datePickerOpen && (
                <DateTimePicker
                  value={startsAt}
                  mode={datePickerOpen}
                  minimumDate={new Date()}
                  onChange={(_, selected) => {
                    setDatePickerOpen(null);
                    if (selected) setStartsAt(selected);
                  }}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                />
              )}
            </View>

            {/* Max participants */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLOURS.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Max people (optional)
              </Text>
              <TextInput
                style={inputStyle("")}
                placeholder="Leave blank for unlimited"
                placeholderTextColor={COLOURS.textTertiary}
                value={maxPeople}
                onChangeText={(t) => setMaxPeople(t.replace(/\D/g, ""))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>

            <Button
              label="Create & go live"
              isLoading={isSubmitting}
              onPress={handleSubmit}
              disabled={!isReady}
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// app/(app)/profile/index.tsx  — Profile screen
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Alert, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui";
import { fetchProfile, fetchParticipantCounts } from "@/services/supabase/chat"; // re-uses the file
import type { Profile } from "@/types";

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
