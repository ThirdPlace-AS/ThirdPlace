import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerTitle: "ThirdPlace" }} />
      <Stack.Screen name="profile" options={{ headerTitle: "Profile" }} />
      <Stack.Screen
        name="+not-found"
        options={{ headerTitle: "Ooops! Not Found" }}
      />
    </Stack>
  );
}
