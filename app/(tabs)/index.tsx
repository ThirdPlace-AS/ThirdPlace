import { Ionicons } from "@expo/vector-icons";
import { AppleMaps, GoogleMaps } from "expo-maps";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
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

const INITIAL_REGION = {
  latitude: 59.9138,
  longitude: 10.7387,
};

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

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
  const [selectedFilter, setSelectedFilter] = useState("Now");
  const filters = ["All", "Now", "Today", "This week", "This weekend"];
  const [markers, setMarkers] = useState<GooglePlace[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<GooglePlace | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // 1. ADDED: State to track if we are fetching high-quality details
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

  const handleMarkerClick = async (event: any) => {
    const clickedId = event?.id || event?.nativeEvent?.id || event?.payload?.id;
    if (!clickedId) return;

    const foundPlace = markers.find(
      (m) => String(m.place_id) === String(clickedId),
    );

    if (foundPlace) {
      setSelectedMarker(foundPlace);

      // 2. MODIFIED: Fetch details with loading state
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
          onMapClick={() => setSelectedMarker(null)}
          style={{ flex: 1, position: "absolute", inset: 0 }}
          cameraPosition={{ coordinates: { ...INITIAL_REGION }, zoom: 14 }}
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          uiSettings={{ zoomControlsEnabled: false, mapToolbarEnabled: false }}
        />

        <SafeAreaView
          className="flex-col justify-between flex-1 px-4"
          pointerEvents="box-none"
        >
          <View className="gap-4">
            <View
              className="flex-row items-center bg-white shadow-2xl rounded-2xl"
              style={{ elevation: 10 }}
            >
              <TouchableOpacity className="items-center justify-center w-12 h-16">
                <Ionicons name="search-outline" size={24} color="#f54900" />
              </TouchableOpacity>
              <TextInput
                className="flex-1 h-16 text-xl"
                placeholder={loading ? "Loading..." : "Search..."}
                placeholderTextColor="#ccc"
              />
              <TouchableOpacity className="items-center justify-center w-12 h-16">
                <Ionicons name="options" size={24} color="#f54900" />
              </TouchableOpacity>
            </View>

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
          </View>

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
            >
              <Ionicons name="locate" size={23} color="#f54900" />
            </TouchableOpacity>
          </View>
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
                {/* 3. MODIFIED: Show Spinner while fetching details */}
                {isFetchingDetails ? (
                  <View className="items-center justify-center w-full h-full">
                    <ActivityIndicator size="large" color="#f54900" />
                    <Text className="mt-2 text-gray-500">
                      Loading gallery...
                    </Text>
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
                        <View className="absolute px-3 py-1 rounded-full bottom-4 right-4 bg-black/50">
                          <Text className="text-xs text-white">
                            {index + 1} / {selectedMarker.photos?.length}
                          </Text>
                        </View>
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
                  className="absolute p-2 rounded-full shadow-md top-4 right-4 bg-white/80"
                  style={{ zIndex: 1001 }}
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
                  <Text className="ml-1 text-xs text-gray-400">
                    ({selectedMarker.user_ratings_total || 0} reviews)
                  </Text>
                </View>

                <View className="mt-4 mb-6">
                  <Text className="mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Address
                  </Text>
                  <Text className="text-base leading-6 text-gray-700">
                    {selectedMarker?.vicinity}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  className="items-center py-4 bg-orange-600 shadow-lg rounded-xl"
                  onPress={() =>
                    console.log("Open Place:", selectedMarker?.place_id)
                  }
                >
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
