import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Swipe() {
  return (
    <SafeAreaView className="items-center justify-center flex-1 bg-slate-900">
      <Text className="text-xl font-bold text-orange-600 ">Swipe</Text>
    </SafeAreaView>
  );
}
