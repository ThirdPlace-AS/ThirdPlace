import { Ionicons } from "@expo/vector-icons";
import { AppleMaps, GoogleMaps } from "expo-maps";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

const INITIAL_REGION = {
  latitude: 59.9138,
  longitude: 10.7387,
};

export default function App() {
  const [selectedFilter, setSelectedFilter] = useState("Now");
  const filters = ["Now", "Today", "This week", "This weekend", "This month"];

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
          className="flex-col justify-between flex-1 pl-2 pr-2 border-2 border-green-600 "
          pointerEvents="box-none"
        >
          / / Top Content / /
          <SafeAreaView className="border-2 ">
            <SafeAreaView className="flex-row items-center justify-center h-0 border-2 border-red-600 ">
              <TouchableOpacity
                activeOpacity={0.9}
                className="items-center justify-center w-12 bg-white h-14 rounded-tl-2xl rounded-bl-2xl"
              >
                <Ionicons name={"search-outline"} size={24} color="#f54900" />
              </TouchableOpacity>
              <TextInput
                className="w-3/4 pl-0 text-xl bg-white h-14 "
                placeholder="Search..."
                placeholderTextColor="#ccc"
              />
              <TouchableOpacity
                activeOpacity={0.9}
                className="items-center justify-center w-12 bg-white h-14 rounded-tr-2xl rounded-br-2xl"
              >
                <Ionicons name={"options"} size={24} color="#f54900" />
              </TouchableOpacity>
            </SafeAreaView>

            <SafeAreaView className="flex-row border-2 border-blue-600 ">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 1,
                  gap: 10,
                  paddingVertical: 0,
                }}
              >
                {filters.map((item) => {
                  const isActive = selectedFilter === item;

                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setSelectedFilter(item)}
                      // Dynamic Tailwind classes based on active state
                      className={`px-6 py-2 rounded-full shadow-sm ${
                        isActive ? "bg-orange-600" : "bg-white"
                      }`}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          isActive ? "text-white" : "text-slate-600"
                        }`}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </SafeAreaView>
          / / / Bottom Content / / /
          <SafeAreaView className={"flex-col gap-5 border-2 h-auto"}>
            <TouchableOpacity
              activeOpacity={0.7}
              className="items-center self-end justify-center w-12 h-12 bg-white rounded-md shadow-xl"
            >
              <Ionicons name={"add"} size={28} color="#f54900" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              className="items-center self-end justify-center w-12 h-12 bg-white rounded-full shadow-xl"
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
