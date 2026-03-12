// ─────────────────────────────────────────────────────────────
// app/(app)/create/index.tsx  — Create experience screen
// ─────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/Button";
import { useLocation } from "@/hooks/useLocation";
import { CATEGORY_META, COLOURS, MAP_CONFIG } from "@/lib/constants";
import { createExperienceSchema } from "@/lib/validators";
import { createExperience } from "@/services/supabase/experiences";
import type { ExperienceCategory } from "@/types/experience";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIES = Object.keys(CATEGORY_META) as ExperienceCategory[];

type DateField = "date" | "time" | null;

export default function CreateScreen() {
  const { requestLocation, reverseGeocode, isLocating } = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExperienceCategory | null>(null);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number>(MAP_CONFIG.DEFAULT_LAT);
  const [longitude, setLongitude] = useState<number>(MAP_CONFIG.DEFAULT_LNG);
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
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) errs[String(issue.path[0])] = issue.message;
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
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLOURS.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Category
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
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
