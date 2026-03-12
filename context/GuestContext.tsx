// ============================================================
// context/GuestContext.tsx
//
// Guest mode lets unauthenticated users explore the app with
// read-only access before committing to sign-up.
//
// DESIGN PRINCIPLES:
//   - Guest state lives ONLY in memory (no AsyncStorage).
//     If the app is killed, the guest starts fresh — this is
//     intentional: it keeps every cold launch nudging toward
//     registration without being hostile about it.
//   - This context is independent of Supabase's session.
//     A user is either: authenticated (has a session),
//     a guest (isGuest = true, no session), or at the auth
//     screens (neither).
//   - Components use `useGuest()` to read/set guest state.
//     They never import from this file directly.
//
// WHAT GUESTS CAN DO:
//   ✅ View the map and all experience pins
//   ✅ Browse the swipe deck (read-only)
//   ✅ Tap pins and view experience detail sheets
//   ✅ See the chat tab (locked, but visible)
//   ✅ See the profile tab (locked, but visible)
//
// WHAT GUESTS CANNOT DO (triggers <GuestGate>):
//   🔒 Join or create an experience
//   🔒 Send or read messages in any chat
//   🔒 View or edit their profile
//   🔒 Save/bookmark experiences
//   🔒 Share their location with friends
// ============================================================

import React, {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from "react";

interface GuestContextValue {
  /** True when the user has explicitly chosen to browse without signing in */
  isGuest: boolean;
  /**
   * Call this to enter guest mode. Clears any lingering error state
   * from a previous failed sign-in attempt.
   */
  enterGuestMode: () => void;
  /**
   * Call this when a guest successfully signs in or signs up.
   * Resets guest state so the full experience is unlocked.
   */
  exitGuestMode: () => void;
}

const GuestContext = createContext<GuestContextValue | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
  }, []);

  return (
    <GuestContext.Provider value={{ isGuest, enterGuestMode, exitGuestMode }}>
      {children}
    </GuestContext.Provider>
  );
}

/**
 * Hook to read and control guest mode.
 * Must be used inside a <GuestProvider>.
 */
export function useGuest(): GuestContextValue {
  const ctx = useContext(GuestContext);
  if (!ctx) {
    throw new Error("useGuest must be used within a <GuestProvider>");
  }
  return ctx;
}
