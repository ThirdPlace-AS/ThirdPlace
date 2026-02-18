import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoLocation from "expo-location";
import { AppleMaps, GoogleMaps } from "expo-maps";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const MY_MAP_ID = process.env.MY_MAP_ID;
const INITIAL_REGION = {
  latitude: 59.9138,
  longitude: 10.7387,
};

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  icon: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: {
    photo_reference: string;
    height: number;
    width: number;
  }[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

// Reusable section title component //
const SectionTitle = ({ title, icon }: { title: string; icon: any }) => (
  <View className="flex-row items-center mt-2 mb-4">
    <Ionicons name={icon} size={18} color="#f54900" />
    <Text className="ml-2 text-xs font-black tracking-widest text-gray-400 uppercase">
      {title}
    </Text>
  </View>
);

// Reusable filter group component //
const FilterGroup = ({
  title,
  items,
  activeFilters,
  onToggle,
}: {
  title: string;
  items: string[];
  activeFilters: string[];
  onToggle: (item: string) => void;
}) => (
  <View className="mb-6">
    <Text className="mb-3 text-sm font-bold text-gray-700">{title}</Text>
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => {
        const isSelected = activeFilters.includes(item);
        return (
          <TouchableOpacity
            key={item}
            onPress={() => onToggle(item)}
            className={`px-4 py-2 rounded-full border ${
              isSelected
                ? "bg-orange-600 border-orange-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isSelected ? "text-white" : "text-gray-600"
              }`}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

export default function App() {
  const mapRef = useRef<any>(null);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(["Discover"]);
  const tabs = ["Discover", "Today", "Free", "Nearby", "Hosted", "Saved"];
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [markers, setMarkers] = useState<GooglePlace[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<GooglePlace | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const searchFadeAnim = useRef(new Animated.Value(0)).current;
  const [userLocation, setUserLocation] = useState<any>(null);
  const searchInputRef = React.useRef<TextInput>(null);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const filterSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(false);

  // Move map to initial region on load
  const handleMapReady = () => {
    if (mapRef.current && typeof mapRef.current.moveCamera === "function") {
      mapRef.current.moveCamera({
        cameraPosition: {
          coordinates: INITIAL_REGION,
          zoom: 14,
        },
        duration: 0,
      });
    }
  };

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Permission to access location was denied");
        return;
      }

      let location = await ExpoLocation.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(coords);
      centerMapOn(coords.latitude, coords.longitude);
    } catch (error) {
      console.error("Location error:", error);
    }
  };

  // Center map on a given location
  const centerMapOn = React.useCallback(
    (lat: number, lng: number, retryCount = 0) => {
      if (mapRef.current?.moveCamera) {
        mapRef.current.moveCamera({
          cameraPosition: {
            coordinates: { latitude: lat, longitude: lng },
            zoom: 16,
          },
          duration: 1000,
        });
      } else if (retryCount < 5) {
        setTimeout(() => centerMapOn(lat, lng, retryCount + 1), 100);
      }
    },
    [],
  );

  // Create markers for Google Places
  const mapMarkers = [
    // Existing Google Places markers
    ...(markers?.map((place) => ({
      id: String(place.place_id),
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      title: place.name,
    })) || []),

    // ADD THIS: User location marker
    ...(userLocation
      ? [
          {
            id: "user-pos",
            coordinates: userLocation,
            title: "You are here",
            // You can even use a different color or icon here
          },
        ]
      : []),
  ];

  // Handle marker click
  const handleMarkerClick = async (event: any) => {
    const clickedId = event?.id || event?.nativeEvent?.id || event?.payload?.id;
    if (!clickedId) return;

    setSearchQuery("");
    setIsSearchActive(false);
    Keyboard.dismiss();

    const foundPlace = markers.find(
      (m) => String(m.place_id) === String(clickedId),
    );

    if (foundPlace) {
      setSelectedMarker(foundPlace);
      centerMapOn(
        foundPlace.geometry.location.lat,
        foundPlace.geometry.location.lng,
      );

      setIsFetchingDetails(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${foundPlace.place_id}&fields=name,rating,photos,vicinity,user_ratings_total&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.result) setSelectedMarker(data.result);
      } catch (err) {
        console.log("Detail fetch error", err);
      } finally {
        setIsFetchingDetails(false);
      }
    }
  };

  // Get photo URL for Google Places
  const getPhotoUrl = (photoReference: string | undefined) => {
    if (!photoReference) return undefined;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
  };

  // Fetch places from Google
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const radius = 2000;
        const type = "tourist_attraction";
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${INITIAL_REGION.latitude},${INITIAL_REGION.longitude}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;

        const response = await fetch(url);
        const json = await response.json();

        if (json.results) {
          setMarkers(json.results);
        }
      } catch (error) {
        console.error("Error fetching places:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaces();
  }, []);

  // Animate search bar
  useEffect(() => {
    Animated.timing(searchFadeAnim, {
      toValue: isSearchActive ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    if (isSearchActive) {
      // Small timeout ensures the modal/view is rendered before focusing
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchActive, searchFadeAnim]);

  // Animate marker selection
  useEffect(() => {
    if (selectedMarker) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedMarker, slideAnim]);

  // Center map on user location
  useEffect(() => {
    if (userLocation) {
      centerMapOn(userLocation.latitude, userLocation.longitude);
    }
  }, [userLocation, centerMapOn]);

  // Load recents from phone memory on startup
  useEffect(() => {
    const loadRecents = async () => {
      try {
        const saved = await AsyncStorage.getItem("@recent_searches");
        if (saved) setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recents", e);
      }
    };
    loadRecents();
  }, []);

  // Save to phone memory whenever the list changes
  useEffect(() => {
    const saveRecents = async () => {
      try {
        await AsyncStorage.setItem(
          "@recent_searches",
          JSON.stringify(recentSearches),
        );
      } catch (e) {
        console.error("Failed to save recents", e);
      }
    };
    saveRecents();
  }, [recentSearches]);

  // Function to toggle modal
  const toggleFilterModal = (open: boolean) => {
    if (open) {
      // Snaps the value to the right edge
      filterSlideAnim.setValue(SCREEN_WIDTH);
      // Mounts the component
      setIsFilterModalVisible(true);
    } else {
      // Animates out
      Animated.timing(filterSlideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsFilterModalVisible(false));
    }
  };

  // Add this useEffect to trigger the "In" animation as soon as the modal mounts
  useEffect(() => {
    if (isFilterModalVisible) {
      Animated.timing(filterSlideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [isFilterModalVisible, filterSlideAnim]); // Added filterSlideAnim here

  const toggleFilter = (item: string) => {
    setActiveFilters((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const resetFilters = () => {
    setActiveFilters([]);
    setIsVerifiedOnly(false);
  };

  if (Platform.OS === "ios") {
    {
      /*  iOS Map  */
    }
    return <AppleMaps.View style={{ flex: 1 }} />;
  } else if (Platform.OS === "android") {
    {
      /*  Android Map  */
    }
    return (
      <>
        <GoogleMaps.View
          ref={mapRef}
          onMapReady={handleMapReady}
          onMapClick={() => {
            setSelectedMarker(null);
            setIsSearchActive(false);
            setSearchQuery("");
            Keyboard.dismiss();
          }}
          style={{ flex: 1, position: "absolute", inset: 0 }}
          cameraPosition={{ coordinates: { ...INITIAL_REGION }, zoom: 14 }}
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          uiSettings={{ zoomControlsEnabled: false, mapToolbarEnabled: false }}
          {...({ googleMapsMapId: MY_MAP_ID } as any)}
          properties={{
            isMyLocationEnabled: true,
          }}
        />

        <SafeAreaView
          className="flex-col justify-between flex-1 px-4"
          pointerEvents="box-none"
        >
          {/* Top container for search bar and filter buttons */}
          <View
            className={`${isSearchActive ? "absolute inset-0 bg-white z-[10000] px-4 pt-4 " : "gap-4 "}`}
            style={
              isSearchActive
                ? {
                    height: SCREEN_HEIGHT,
                    width: SCREEN_WIDTH,
                    left: 0,
                    top: 0,
                  }
                : {}
            }
          >
            {/* Search before click */}
            <View
              className="flex-row items-center bg-white shadow-2xl rounded-2xl"
              style={{ elevation: 10 }}
            >
              {/* Search Icon / Back Button */}
              <TouchableOpacity
                className="items-center justify-center w-12 h-16"
                activeOpacity={0.8}
                onPress={() => {
                  if (isSearchActive) {
                    // If active: Close search, clear text, dismiss keyboard
                    setIsSearchActive(false);
                    setSearchQuery("");
                    Keyboard.dismiss();
                  } else {
                    // If inactive: Open search, close bottom sheet, focus input
                    setIsSearchActive(true);
                    setSelectedMarker(null);
                    // Small delay ensures the component renders before we focus
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
              >
                <Ionicons
                  name={isSearchActive ? "arrow-back" : "search-outline"}
                  size={24}
                  color="#f54900"
                />
              </TouchableOpacity>

              {/* Text Input */}
              <TextInput
                ref={searchInputRef}
                className="flex-1 h-16 text-xl"
                placeholder={loading ? "Loading..." : "Search markers..."}
                placeholderTextColor="#ccc"
                value={searchQuery}
                onFocus={() => {
                  setIsSearchActive(true);
                  setSelectedMarker(null); // Closes bottom sheet on tap
                }}
                onChangeText={(text) => setSearchQuery(text)}
              />

              {/* Clear Text 'X' Button - Only shows when typing */}
              {isSearchActive && searchQuery.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSearchQuery("")}
                  className="px-2"
                >
                  <Ionicons name="close-circle" size={20} color="#ccc" />
                </TouchableOpacity>
              )}

              {/* Filter Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                className="items-center justify-center w-12 h-16"
                onPress={() => toggleFilterModal(true)}
              >
                <Ionicons name="options" size={24} color="#f54900" />
              </TouchableOpacity>
            </View>
            {/* Search bar after click */}
            {isSearchActive ? (
              <Animated.View
                style={{
                  flex: 1,
                  opacity: searchFadeAnim,
                  transform: [
                    {
                      translateY: searchFadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <ScrollView className="flex-1 mt-4">
                  {searchQuery.length > 0 ? (
                    (() => {
                      const filteredResults = markers.filter((m) =>
                        m.name
                          .toLowerCase()
                          .startsWith(searchQuery.toLowerCase()),
                      );
                      if (filteredResults.length === 0) {
                        return (
                          <View className="items-center justify-center pt-20">
                            <Ionicons
                              name="alert-circle-outline"
                              size={40}
                              color="#eee"
                            />
                            <Text className="mt-2 text-gray-400">
                              No places match {"\u201C"}
                              {searchQuery}
                              {"\u201D"}
                            </Text>
                          </View>
                        );
                      }
                      return filteredResults.map((item) => (
                        <TouchableOpacity
                          key={item.place_id}
                          className="flex-row items-center p-4 border-b border-gray-100"
                          onPress={() => {
                            setSearchQuery("");
                            setIsSearchActive(false);
                            setSelectedMarker(item);
                            Keyboard.dismiss();
                            centerMapOn(
                              item.geometry.location.lat,
                              item.geometry.location.lng,
                            );

                            setRecentSearches((prev) => {
                              const filtered = prev.filter(
                                (s) => s !== item.name,
                              );
                              return [item.name, ...filtered].slice(0, 12);
                            });
                          }}
                        >
                          <Ionicons
                            name="location-outline"
                            size={25}
                            color="#666"
                          />
                          <View className="ml-3">
                            <Text className="text-lg font-semibold text-gray-800">
                              {item.name}
                            </Text>
                            <Text className="text-sm text-gray-500">
                              {item.vicinity}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ));
                    })()
                  ) : (
                    <View>
                      {recentSearches.length > 0 && (
                        <View className="mb-6">
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                              Recent Searches
                            </Text>
                            <TouchableOpacity
                              onPress={() => setRecentSearches([])}
                            >
                              <Text className="text-xs font-bold text-orange-500">
                                CLEAR
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {recentSearches.map((term, index) => (
                            <TouchableOpacity
                              key={index}
                              className="flex-row items-center py-3 border-b border-gray-50"
                              onPress={() => setSearchQuery(term)}
                            >
                              <Ionicons
                                name="time-outline"
                                size={20}
                                color="#ccc"
                              />
                              <Text className="ml-3 text-lg text-gray-600">
                                {term}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      <View className="items-center justify-center pt-10">
                        <Ionicons name="search" size={40} color="#eee" />
                        <Text className="mt-2 text-gray-400">
                          Search for places on the map...
                        </Text>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            ) : (
              // Quick Tabs
              <View className="flex-row">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {tabs.map((item) => {
                    const isActive = selectedTabs.includes(item);
                    return (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        key={item}
                        onPress={() => {
                          setSelectedTabs((prev) => {
                            // 1. If user clicks "Discover"
                            if (item === "Discover") {
                              return isActive ? [] : ["Discover"];
                            }

                            // 2. If user clicks any other tab
                            const withoutDiscover = prev.filter(
                              (t) => t !== "Discover",
                            );

                            if (isActive) {
                              // Remove the tab if it was already there
                              return withoutDiscover.filter((t) => t !== item);
                            } else {
                              // Add the tab and ensure Discover is gone
                              return [...withoutDiscover, item];
                            }
                          });
                        }}
                        className={`px-6 py-2 rounded-full ${
                          isActive ? "bg-orange-600" : "bg-white"
                        }`}
                        style={{ elevation: 5 }}
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
              </View>
            )}
          </View>
          {/*bottom container for add marker and locate buttons */}
          {!isSearchActive && (
            <View className="flex-col gap-4 mb-4">
              <TouchableOpacity
                activeOpacity={0.87}
                className="items-center self-end justify-center w-12 h-12 bg-orange-500 rounded-full"
                style={{ elevation: 8 }}
              >
                <Ionicons name="add" size={23} color="#ffff" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.87}
                className="items-center self-end justify-center w-12 h-12 bg-white rounded-full"
                style={{ elevation: 8 }}
                onPress={() => requestLocationPermission()}
              >
                <Ionicons name="locate" size={23} color="#f54900" />
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
        {/* Slide-up panel for selected marker details */}
        <Animated.View
          className="absolute bottom-0 w-full overflow-hidden bg-white rounded-t-3xl"
          style={{
            transform: [{ translateY: slideAnim }],
            elevation: 35,
            zIndex: 9999,
          }}
        >
          {selectedMarker && (
            <>
              <View className="w-full h-56 bg-gray-200">
                {isFetchingDetails ? (
                  <View className="items-center justify-center w-full h-full">
                    <ActivityIndicator size="large" color="#f54900" />
                  </View>
                ) : selectedMarker.photos &&
                  selectedMarker.photos.length > 0 ? (
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                  >
                    {selectedMarker.photos.map((photo, index) => (
                      <View key={index} style={{ width: SCREEN_WIDTH }}>
                        <Image
                          source={{ uri: getPhotoUrl(photo.photo_reference) }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View className="items-center justify-center w-full h-full">
                    <Ionicons name="image-outline" size={48} color="#ccc" />
                  </View>
                )}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedMarker(null)}
                  className="absolute p-2 rounded-full top-4 right-4 bg-white/80"
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View className="p-6">
                <Text className="text-2xl font-bold text-gray-800">
                  {selectedMarker?.name}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="star" size={16} color="#fbbf24" />
                  <Text className="ml-1 font-bold text-gray-700">
                    {selectedMarker.rating || "N/A"}
                  </Text>
                </View>
                <Text className="mt-4 text-base text-gray-700">
                  {selectedMarker?.vicinity}
                </Text>
                <TouchableOpacity className="items-center py-4 mt-6 bg-orange-600 shadow-lg rounded-xl">
                  <Text className="text-lg font-bold text-white">
                    See More Info
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>

        {/* Filter Modal */}
        {isFilterModalVisible && (
          <Animated.View
            style={{
              transform: [{ translateX: filterSlideAnim }],
              zIndex: 20000,
            }}
            className="absolute inset-0 bg-white"
          >
            <SafeAreaView className="flex-1">
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => toggleFilterModal(false)}>
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text className="text-xl font-bold">Filters</Text>
                <TouchableOpacity onPress={resetFilters}>
                  <Text className="font-semibold text-orange-600">Reset</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1 px-6 pt-4">
                {/* 🧭 CATEGORY FILTERS */}
                <SectionTitle title="CATEGORY FILTERS" icon="options" />
                <FilterGroup
                  title="Food & Drink"
                  items={[
                    "Cafés",
                    "Restaurants",
                    "Street Food",
                    "Bars",
                    "Brunch Spots",
                    "Hidden Gems",
                  ]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />
                <FilterGroup
                  title="Activities"
                  items={[
                    "Outdoor",
                    "Hikes",
                    "Sports",
                    "Creative Workshops",
                    "Volunteering",
                    "Live Music",
                    "Classes & Learning",
                    "Events",
                    "Pop-ups",
                    "Markets",
                  ]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />
                <FilterGroup
                  title="Vibe-Based"
                  items={[
                    "Chill",
                    "Social",
                    "Adventurous",
                    "Cozy",
                    "Productive",
                    "Cultural",
                    "Romantic",
                    "Budget-friendly",
                    "Luxury",
                  ]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />

                <View className="h-px my-6 bg-gray-100" />

                {/* 🧠 SMART FILTERS */}
                <SectionTitle title="SMART FILTERS" icon="filter-outline" />
                <FilterGroup
                  title="Distance"
                  items={["1 km", "5 km", "10 km", "Anywhere"]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />
                <FilterGroup
                  title="Price"
                  items={["Free", "$", "$$", "$$$"]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />
                <FilterGroup
                  title="Group Size"
                  items={[
                    "Solo friendly",
                    "2–4 people",
                    "5–10 people",
                    "Big groups",
                  ]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />

                <FilterGroup
                  title="Age Range (for hosted experiences)"
                  items={["All ages", "18+", "21+", "30+", "40+", "50+"]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />

                <FilterGroup
                  title="Difficulty (for hikes/sports)"
                  items={["Easy", "Moderate", "Advanced"]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />

                <FilterGroup
                  title="Duration"
                  items={["Under 1 hour", "1-3 hours", "Half day", "Full day"]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />

                <FilterGroup
                  title="Setting"
                  items={["Indoor", "Outdoor", "Both"]}
                  activeFilters={activeFilters}
                  onToggle={(item) => toggleFilter(item)}
                />

                {/* Verified Only Toggle */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsVerifiedOnly(!isVerifiedOnly)}
                  className="flex-row items-center justify-between px-4 py-4 mt-4 mb-10 bg-gray-50 rounded-xl"
                >
                  <View>
                    <Text className="font-bold text-gray-800">
                      Verified Only
                    </Text>
                    <Text className="text-xs text-gray-500">
                      Show only trusted ThirdPlaces
                    </Text>
                  </View>
                  <View
                    className={`w-12 h-6 rounded-full px-1 justify-center ${isVerifiedOnly ? "bg-orange-600 items-end" : "bg-gray-300 items-start"}`}
                  >
                    <View className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </View>
                </TouchableOpacity>
              </ScrollView>

              {/* Apply Button */}
              <View className="p-6 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => toggleFilterModal(false)}
                  className="items-center py-4 bg-orange-600 rounded-2xl"
                >
                  <Text className="text-lg font-bold text-white">
                    Apply Filters
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        )}
      </>
    );
  } else {
    return <Text>Maps are only available on Android and iOS</Text>;
  }
}
