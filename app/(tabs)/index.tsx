import { Ionicons } from "@expo/vector-icons";
import { AppleMaps, GoogleMaps } from "expo-maps";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

const INITIAL_REGION = {
  latitude: 59.9138,
  longitude: 10.7387,
};

export default function App() {
  const [selectedFilter, setSelectedFilter] = useState("Now");
  const filters = [
    "All",
    "Now",
    "Today",
    "This week",
    "This weekend",
    "This month",
  ];

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
            inset: 0,
          }}
          cameraPosition={{
            coordinates: { ...INITIAL_REGION },
            zoom: 15,
          }}
          uiSettings={{
            zoomControlsEnabled: false, // Hides the +/- buttons
            myLocationButtonEnabled: false, // Hides the default GPS button
            compassEnabled: false, // Keeps the compass visible
            mapToolbarEnabled: false, // Hides the "Open in Maps" toolbar
            scrollGesturesEnabled: true,
            zoomGesturesEnabled: true,
          }}
        />
        <SafeAreaView
          className="flex-col justify-between flex-1 px-4"
          pointerEvents="box-none"
        >
          {/* Top Content */}
          <View className="gap-4">
            {/* Search Bar Container - Grouped for a single unified shadow */}
            <View
              className="flex-row items-center bg-white shadow-2xl rounded-2xl"
              style={{
                elevation: 10, // Strong pop for Android
                shadowColor: "#000", // iOS Shadow color
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                className="items-center justify-center w-12 h-16"
              >
                <Ionicons name="search-outline" size={24} color="#f54900" />
              </TouchableOpacity>

              <TextInput
                className="flex-1 h-16 text-xl"
                placeholder="Search..."
                placeholderTextColor="#ccc"
              />

              <TouchableOpacity
                activeOpacity={0.8}
                className="items-center justify-center w-12 h-16"
              >
                <Ionicons name="options" size={24} color="#f54900" />
              </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <View className="flex-row">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {filters.map((item) => {
                  const isActive = selectedFilter === item;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      key={item}
                      onPress={() => setSelectedFilter(item)}
                      className={`px-6 py-2 rounded-full ${isActive ? "bg-orange-600" : "bg-white"}`}
                      style={{
                        elevation: 5,
                        shadowColor: "#000",
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                      }}
                    >
                      <Text
                        className={`text-base font-semibold ${isActive ? "text-white" : "text-slate-600"}`}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Bottom Content */}
          <View className="flex-col gap-4 mb-4">
            <TouchableOpacity
              activeOpacity={0.87}
              className="items-center self-end justify-center w-12 h-12 bg-orange-500 rounded-full"
              style={{ elevation: 8, shadowOpacity: 0.3, shadowRadius: 4 }}
            >
              <Ionicons name="add" size={23} color="#ffff" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.87}
              className="items-center self-end justify-center w-12 h-12 bg-white rounded-full"
              style={{ elevation: 8, shadowOpacity: 0.3, shadowRadius: 4 }}
            >
              <Ionicons name="locate" size={23} color="#f54900" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  } else {
    return <Text>Maps are only available on Android and iOS</Text>;
  }
}
