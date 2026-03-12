// ─────────────────────────────────────────────────────────────
// services/push/notifications.ts
// Registers the device's Expo push token with Supabase so the
// backend can send targeted push notifications.
// ─────────────────────────────────────────────────────────────
import { supabase } from "@/services/supabase/client";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
 
export async function registerPushToken(): Promise<void> {
  // Push notifications only work on physical devices.
  if (!Constants.isDevice) return;
 
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
 
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;
 
  const token = (await Notifications.getExpoPushTokenAsync()).data;
 
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
 
  // Store token on profile so Edge Functions can send targeted pushes.
  await supabase
    .from("profiles")
    .update({ push_token: token })
    .eq("id", user.id);
}