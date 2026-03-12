// ─────────────────────────────────────────────────────────────
// app/(auth)/_layout.tsx
// ─────────────────────────────────────────────────────────────
import { Stack } from "expo-router";

export function AuthLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}

export default AuthLayout;
