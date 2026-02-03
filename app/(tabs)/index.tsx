import { Ionicons } from "@expo/vector-icons";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { Platform, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

const INITIAL_REGION = {
  latitude: 59.9138,
  longitude: 10.7387,
};

export default function App() {
  // iOS implementation
  if (Platform.OS === "ios") {
    return <AppleMaps.View style={{ flex: 1 }} />;
  } else if (Platform.OS === "android") {
    // Android implementation

    return (
      <>
        <GoogleMaps.View
          style={{
            flex: 1,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          cameraPosition={{
            coordinates: { ...INITIAL_REGION },
            zoom: 15,
          }}
        />
        <SafeAreaView
          className="flex flex-col justify-between flex-1 pl-2 pr-2 border-2 border-blue-500 "
          pointerEvents="box-none"
        >
          <SafeAreaView className="flex justify-center border-2">
            <TextInput
              className="self-center w-3/4 h-12 text-xl text-center rounded-full bg-slate-50"
              placeholder="Search"
              placeholderTextColor="#ccc"
            />
            <SafeAreaView className="flex-row gap-3">
              <Text className="self-center p-1 text-lg text-center rounded-md w-fit bg-slate-100">
                Filter 1
              </Text>
              <Text className="self-center p-1 text-lg text-center rounded-md w-fit bg-slate-100">
                Filter 2
              </Text>
              <Text className="self-center p-1 text-lg text-center rounded-md w-fit bg-slate-100">
                Filter 3
              </Text>
              <Text className="self-center p-1 text-lg text-center rounded-md w-fit bg-slate-100">
                Filter 4
              </Text>
            </SafeAreaView>
          </SafeAreaView>
          <SafeAreaView className={"flex-col gap-3 border-2 h-auto"}>
            <TouchableOpacity
              activeOpacity={0.7}
              className="items-center self-end justify-center w-12 h-12 rounded-md bg-slate-50"
            >
              <Ionicons name={"add"} size={28} color="#f54900" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              className="items-center self-end justify-center w-12 h-12 rounded-full bg-slate-50"
            >
              <Ionicons name={"locate"} size={22} color="#f54900" />
            </TouchableOpacity>
          </SafeAreaView>
        </SafeAreaView>
      </>
    );
  } else {
    return <Text>Maps are only available on Android and iOS</Text>;
  }
}
