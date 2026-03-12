import { Link } from "expo-router";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="items-center justify-center flex-1 bg-light-white">
      <Text className="mb-2 text-xl font-bold text-red-600">
        Page not found!
      </Text>
      <Link href="/map">
        <Text className="text-xl font-bold text-green-600">
          Go back to Home Screen
        </Text>
      </Link>
    </SafeAreaView>
  );
}
