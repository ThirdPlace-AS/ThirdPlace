// ─────────────────────────────────────────────────────────────
// app/_layout.tsx  — Root layout + AuthGate + GuestProvider
// ─────────────────────────────────────────────────────────────
import { GuestProvider, useGuest } from "@/context/GuestContext";
import { useAuth } from "@/hooks/useAuth";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

// ─── Auth + Guest gate ────────────────────────────────────────
// Rules:
//   - Authenticated user on (auth) screen → push to app
//   - Unauthenticated, non-guest, on (app) screen → push to welcome
//   - Guest on (app) screen → allow through (GuestGate handles per-action blocking)
//   - Guest on (auth) screen → allow through (they might want to sign up)
function AuthGate() {
  const { session, isLoading } = useAuth();
  const { isGuest } = useGuest();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === "(auth)";

    // Authenticated → never show auth screens
    if (session && inAuth) {
      router.replace("/(app)/map");
      return;
    }

    // Neither authenticated nor guest → must go to welcome
    // (Guests are allowed into (app) — their access is limited
    //  at the feature level by GuestGate, not at routing level)
    if (!session && !isGuest && !inAuth) {
      router.replace("/(auth)/welcome");
    }
  }, [session, isLoading, isGuest, segments]);

  return null;
}

export default function RootLayout() {
  return (
    // GuestProvider wraps the entire tree so any component can
    // call useGuest() without prop-drilling.
    <GuestProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AuthGate />
          <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </GuestProvider>
  );
}
