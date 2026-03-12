// ─────────────────────────────────────────────────────────────
// hooks/useAuth.ts
// Owns ALL authentication state. Screens import this, never supabase.
// ─────────────────────────────────────────────────────────────
import { supabase } from "@/services/supabase/client";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  session:   Session | null;
  user:      User | null;
  isLoading: boolean;
  error:     AuthError | null;
}

interface AuthActions {
  signInWithEmail:    (email: string, password: string) => Promise<void>;
  signUpWithEmail:    (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle:   () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithPhone:    (phone: string) => Promise<void>;
  verifyOTP:          (phone: string, token: string) => Promise<void>;
  signOut:            () => Promise<void>;
  clearError:         () => void;
}

export function useAuth(): AuthState & AuthActions {
  const [session,   setSession]   = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<AuthError | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setIsLoading(false);
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error);
  }, []);

  const signUpWithEmail = useCallback(async (
    email: string, password: string, displayName: string,
  ) => {
    setError(null);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: displayName } },
    });
    if (error) setError(error);
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google" | "facebook") => {
    setError(null);
    const redirectTo = makeRedirectUri({ scheme: "thirdplace" });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) { setError(error); return; }
    if (!data.url) return;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "success") {
      await supabase.auth.exchangeCodeForSession(result.url);
    }
  }, []);

  const signInWithGoogle   = useCallback(() => signInWithOAuth("google"),   [signInWithOAuth]);
  const signInWithFacebook = useCallback(() => signInWithOAuth("facebook"), [signInWithOAuth]);

  const signInWithPhone = useCallback(async (phone: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) setError(error);
  }, []);

  const verifyOTP = useCallback(async (phone: string, token: string) => {
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) setError(error);
  }, []);

  const signOut    = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    user:      session?.user ?? null,
    isLoading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithFacebook,
    signInWithPhone,
    verifyOTP,
    signOut,
    clearError,
  };
}