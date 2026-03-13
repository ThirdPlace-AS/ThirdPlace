// app/auth/callback.tsx
// Handles Supabase deep-link redirects (OAuth + email confirmation).
//
// Why this screen exists:
// - Supabase sends users back to your app using a deep link (redirectTo).
// - Expo Router will navigate to /auth/callback automatically.
// - We exchange the code in the URL for a Supabase session, then route to the app.
//
// This keeps auth flows reliable across:
// - OAuth (Google/Facebook)
// - Email confirmation ("Confirm email" enabled in Supabase)
// - Magic links (if you add them later)
import { Button } from "@/components/ui/Button";
import { COLOURS } from "@/lib/constants";
import { supabase } from "@/services/supabase/client";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Prevent double-processing (Linking.useURL can fire multiple times)
      if (handledRef.current) return;

      const rawUrl = url ?? (await Linking.getInitialURL());
      if (!rawUrl) return;

      handledRef.current = true;

      try {
        // If we already have a session (e.g. OAuth handler already exchanged),
        // just continue into the app.
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/(app)/map");
          return;
        }

        // Primary path: PKCE code exchange (OAuth + modern email links).
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(rawUrl);

        // Fallback: some Supabase email links use token_hash + type instead.
        if (exchangeError) {
          const parsed = Linking.parse(rawUrl);
          const tokenHash = parsed.queryParams?.token_hash;
          const type = parsed.queryParams?.type;

          if (typeof tokenHash === "string" && typeof type === "string") {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              // Supabase types include signup/magiclink/recovery/etc.
              type: type as any,
            });
            if (verifyError) throw verifyError;
          } else {
            throw exchangeError;
          }
        }

        router.replace("/(app)/map");
      } catch (e) {
        // If exchange failed but a session exists anyway, continue.
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace("/(app)/map");
            return;
          }
        } catch {
          // ignore
        }

        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Authentication failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLOURS.white }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 14,
        }}
      >
        {!error ? (
          <>
            <ActivityIndicator size="large" color={COLOURS.accent} />
            <Text style={{ color: COLOURS.textSecondary, fontSize: 14 }}>
              Signing you in...
            </Text>
          </>
        ) : (
          <>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: COLOURS.textPrimary,
                textAlign: "center",
              }}
            >
              Sign-in failed
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: COLOURS.textSecondary,
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              {error}
            </Text>
            <View style={{ height: 6 }} />
            <Button
              label="Back to sign in"
              size="lg"
              onPress={() => router.replace("/(auth)/sign-in")}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
