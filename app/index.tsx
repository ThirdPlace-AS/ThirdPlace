import { Link } from "expo-router";
import { Text, View } from "react-native";
import "../global.css";

export default function App() {
  return (
    <View className="items-center justify-center flex-1 bg-light-white">
      <Text className="text-xl font-bold text-blue-500 ">
        Welcome to ThirdPlace!
      </Text>
      <Link href="/profile">
        <Text className="text-xl font-bold text-black-500">Go to Profile</Text>
      </Link>
    </View>
  );
}
