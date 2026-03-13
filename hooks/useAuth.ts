// ─────────────────────────────────────────────────────────────
// hooks/useAuth.ts
// Owns ALL authentication state. Screens import this, never supabase.
// ─────────────────────────────────────────────────────────────
import { supabase } from "@/services/supabase/client";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
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
  /**
   * Returns a simple outcome so the UI can show the correct next step.
   * `confirm_email` is common when Supabase "Confirm email" is enabled.
   */
  signUpWithEmail:    (email: string, password: string, displayName: string) => Promise<"signed_in" | "confirm_email" | "error">;
  /** Re-send the email confirmation link for a signup attempt. */
  resendSignUpEmail:  (email: string) => Promise<void>;
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

  // Single source of truth for every auth redirect deep link used by Supabase.
  // Note: this URL must be allowed in Supabase Auth settings (Redirect URLs).
  const getRedirectTo = useCallback(() => {
    return Linking.createURL("auth/callback", { scheme: "thirdplace" });
  }, []);
 
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

    // Prefer deep-link redirect so the user returns to the app after confirming.
    // If the project's Supabase Redirect URLs don't include it yet, retry without
    // `emailRedirectTo` so account creation still works.
    const redirectTo = getRedirectTo();

    const attempt = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName }, emailRedirectTo: redirectTo },
    });

    // Retry without redirect when Supabase rejects the URL.
    const needsRetryWithoutRedirect =
      !!attempt.error && /redirect/i.test(attempt.error.message);

    const { data, error } = needsRetryWithoutRedirect
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName } },
        })
      : attempt;

    if (error) {
      setError(error);
      return "error";
    }

    // When "Confirm email" is enabled, Supabase creates the user but doesn't
    // create a session until the email link is clicked.
    return data.session ? "signed_in" : "confirm_email";
  }, [getRedirectTo]);

  const resendSignUpEmail = useCallback(async (email: string) => {
    setError(null);
    const redirectTo = getRedirectTo();

    const attempt = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });

    // Retry without redirect when Supabase rejects the URL.
    const needsRetryWithoutRedirect =
      !!attempt.error && /redirect/i.test(attempt.error.message);

    const { error } = needsRetryWithoutRedirect
      ? await supabase.auth.resend({ type: "signup", email })
      : attempt;

    if (error) setError(error);
  }, [getRedirectTo]);
 
  const signInWithOAuth = useCallback(async (provider: "google" | "facebook") => {
    setError(null);
    const redirectTo = getRedirectTo();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) { setError(error); return; }
    if (!data.url) return;
 
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "success") {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(result.url);
      if (exchangeError) setError(exchangeError);
    }
  }, [getRedirectTo]);
 
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
    resendSignUpEmail,
    signInWithGoogle,
    signInWithFacebook,
    signInWithPhone,
    verifyOTP,
    signOut,
    clearError,
  };
}
