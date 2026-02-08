import { Ionicons } from "@expo/vector-icons";
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

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const INITIAL_REGION = {
  latitude: 59.9138,
  longitude: 10.7387,
};

const MY_MAP_ID = process.env.MY_MAP_ID;

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

export default function App() {
  const mapRef = useRef<any>(null);
  const [selectedFilter, setSelectedFilter] = useState("Now");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const filters = ["All", "Now", "Today", "This week", "This weekend"];
  const [markers, setMarkers] = useState<GooglePlace[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<GooglePlace | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const searchFadeAnim = useRef(new Animated.Value(0)).current;

  const handleMapReady = () => {
    if (mapRef.current) {
      mapRef.current.setCamera({
        center: { latitude: 37.78825, longitude: -122.4324 },
        zoom: 15,
      });
    }
  };

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

  useEffect(() => {
    Animated.timing(searchFadeAnim, {
      toValue: isSearchActive ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isSearchActive, searchFadeAnim]);

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

  // UPDATED: Removed the .filter() so the map always displays all fetched markers
  const mapMarkers = markers
    ? markers
        .map((place) => {
          if (!place?.geometry?.location) return null;
          return {
            id: String(place.place_id),
            coordinates: {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            },
            title: place.name || "Unknown Place",
            snippet: place.vicinity || "",
            iconUri: place?.icon,
          };
        })
        .filter((marker): marker is any => marker !== null)
    : [];

  const centerMapOn = (lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.setCamera({
        coordinates: { latitude: lat, longitude: lng },
        zoom: 16,
        animationDuration: 1000,
      });
    }
  };

  const handleMarkerClick = async (event: any) => {
    const clickedId = event?.id || event?.nativeEvent?.id || event?.payload?.id;
    if (!clickedId) return;

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

  const getPhotoUrl = (photoReference: string | undefined) => {
    if (!photoReference) return undefined;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
  };

  if (Platform.OS === "ios") {
    return <AppleMaps.View style={{ flex: 1 }} />;
  } else if (Platform.OS === "android") {
    return (
      <>
        <GoogleMaps.View
          ref={mapRef}
          onMapReady={handleMapReady}
          onMapClick={() => {
            setSelectedMarker(null);
            if (isSearchActive) {
              setIsSearchActive(false);
              Keyboard.dismiss();
            }
          }}
          style={{ flex: 1, position: "absolute", inset: 0 }}
          cameraPosition={{ coordinates: { ...INITIAL_REGION }, zoom: 14 }}
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          uiSettings={{ zoomControlsEnabled: false, mapToolbarEnabled: false }}
          {...({ googleMapsMapId: MY_MAP_ID } as any)}
        />

        <SafeAreaView
          className="flex-col justify-between flex-1 px-4"
          pointerEvents="box-none"
        >
          <View
            className={`${isSearchActive ? "absolute inset-0 bg-white z-[10000] px-4 pt-4" : "gap-4"}`}
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
            <View
              className="flex-row items-center bg-white shadow-2xl rounded-2xl"
              style={{ elevation: 10 }}
            >
              <TouchableOpacity
                className="items-center justify-center w-12 h-16"
                activeOpacity={0.8}
                onPress={() => {
                  if (isSearchActive) {
                    setIsSearchActive(false);
                    setSearchQuery("");
                    Keyboard.dismiss();
                  }
                }}
              >
                <Ionicons
                  name={isSearchActive ? "arrow-back" : "search-outline"}
                  size={24}
                  color="#f54900"
                />
              </TouchableOpacity>

              <TextInput
                className="flex-1 h-16 text-xl"
                placeholder={loading ? "Loading..." : "Search markers..."}
                placeholderTextColor="#ccc"
                value={searchQuery}
                onFocus={() => setIsSearchActive(true)}
                onChangeText={(text) => setSearchQuery(text)}
              />

              {isSearchActive && searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  className="px-2"
                >
                  <Ionicons name="close-circle" size={20} color="#ccc" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                className="items-center justify-center w-12 h-16"
              >
                <Ionicons name="options" size={24} color="#f54900" />
              </TouchableOpacity>
            </View>

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
                            setSearchQuery(item.name);
                            setIsSearchActive(false);
                            setSelectedMarker(item);
                            Keyboard.dismiss();
                            centerMapOn(
                              item.geometry.location.lat,
                              item.geometry.location.lng,
                            );
                          }}
                        >
                          <Ionicons
                            name="location-outline"
                            size={20}
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
                    <View className="items-center justify-center pt-20">
                      <Ionicons name="search" size={40} color="#eee" />
                      <Text className="mt-2 text-gray-400">
                        Search for places on the map...
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            ) : (
              <View className="flex-row">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {filters.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setSelectedFilter(item)}
                      className={`px-6 py-2 rounded-full ${selectedFilter === item ? "bg-orange-600" : "bg-white"}`}
                      style={{ elevation: 5 }}
                    >
                      <Text
                        className={`text-base font-semibold ${selectedFilter === item ? "text-white" : "text-slate-600"}`}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {!isSearchActive && (
            <View className="flex-col gap-4 mb-4">
              <TouchableOpacity
                className="items-center self-end justify-center w-12 h-12 bg-orange-500 rounded-full"
                style={{ elevation: 8 }}
              >
                <Ionicons name="add" size={23} color="#ffff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center self-end justify-center w-12 h-12 bg-white rounded-full"
                style={{ elevation: 8 }}
                onPress={() =>
                  centerMapOn(INITIAL_REGION.latitude, INITIAL_REGION.longitude)
                }
              >
                <Ionicons name="locate" size={23} color="#f54900" />
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>

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
      </>
    );
  } else {
    return <Text>Maps are only available on Android and iOS</Text>;
  }
}
