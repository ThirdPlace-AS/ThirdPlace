import {
  FILTER_GROUPS,
  QUICK_TABS,
  SMART_FILTER_GROUPS,
} from "@/constants/experienceFilters";
import {
  GooglePlace,
  INITIAL_REGION,
  useExperienceMap,
} from "@/hooks/useExperienceMap";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { useImage } from "expo-image";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  LayoutAnimation,
  Linking,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  SlideInDown,
  SlideInRight,
  SlideOutDown,
  SlideOutRight,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MY_MAP_ID = process.env.MY_MAP_ID;
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
let persistedMapCamera: {
  coordinates: { latitude: number; longitude: number };
  zoom: number;
} | null = null;

// Shared mini section heading used inside filter modal.
const SectionTitle = ({
  title,
  icon,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) => (
  <View className="flex-row items-center mt-2 mb-4">
    <Ionicons name={icon} size={18} color="#f54900" />
    <Text className="ml-2 text-xs font-black tracking-widest text-gray-400 uppercase">
      {title}
    </Text>
  </View>
);

const FilterGroup = ({
  title,
  items,
  activeFilters,
  onToggle,
}: {
  title: string;
  items: readonly string[];
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

const ActiveFiltersSummary = ({
  filters,
  onRemove,
}: {
  filters: string[];
  onRemove: (item: string) => void;
}) => {
  if (filters.length === 0) return null;

  return (
    <View className="mb-6">
      <Text className="mb-2 text-xs font-bold tracking-widest text-gray-400 uppercase">
        Active Selections ({filters.length})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row"
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              onRemove(filter);
            }}
            className="flex-row items-center bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-full mr-2"
          >
            <Text className="mr-1 text-sm font-medium text-orange-700">
              {filter}
            </Text>
            <Ionicons name="close-circle" size={14} color="#f54900" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const getPhotoUrl = (photoReference: string | undefined) => {
  if (!photoReference || !GOOGLE_API_KEY) return undefined;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
};

const MARKER_ICON_MODULES = [
  require("../../assets/markers/cluster.png"),
  require("../../assets/markers/default.png"),
  require("../../assets/markers/user.png"),
  require("../../assets/markers/restaurant.png"),
  require("../../assets/markers/cafe.png"),
  require("../../assets/markers/bar.png"),
  require("../../assets/markers/bakery.png"),
  require("../../assets/markers/meal_takeaway.png"),
  require("../../assets/markers/park.png"),
  require("../../assets/markers/tourist_attraction.png"),
  require("../../assets/markers/campground.png"),
  require("../../assets/markers/hiking_area.png"),
  require("../../assets/markers/zoo.png"),
  require("../../assets/markers/aquarium.png"),
  require("../../assets/markers/museum.png"),
  require("../../assets/markers/art_gallery.png"),
  require("../../assets/markers/movie_theater.png"),
  require("../../assets/markers/performing_arts_theater.png"),
  require("../../assets/markers/gym.png"),
  require("../../assets/markers/bowling_alley.png"),
  require("../../assets/markers/amusement_park.png"),
  require("../../assets/markers/spa.png"),
  require("../../assets/markers/shopping_mall.png"),
  require("../../assets/markers/market.png"),
  require("../../assets/markers/library.png"),
  require("../../assets/markers/coworking_space.png"),
] as const;

const getEmojiIconSourceForType = (
  typeTag: string | undefined,
  isCluster: boolean,
) => {
  if (isCluster) return require("../../assets/markers/cluster.png");
  switch (typeTag) {
    case "restaurant":
      return require("../../assets/markers/restaurant.png");
    case "cafe":
      return require("../../assets/markers/cafe.png");
    case "bar":
      return require("../../assets/markers/bar.png");
    case "bakery":
      return require("../../assets/markers/bakery.png");
    case "meal_takeaway":
      return require("../../assets/markers/meal_takeaway.png");
    case "park":
      return require("../../assets/markers/park.png");
    case "tourist_attraction":
      return require("../../assets/markers/tourist_attraction.png");
    case "campground":
      return require("../../assets/markers/campground.png");
    case "hiking_area":
      return require("../../assets/markers/hiking_area.png");
    case "zoo":
      return require("../../assets/markers/zoo.png");
    case "aquarium":
      return require("../../assets/markers/aquarium.png");
    case "museum":
      return require("../../assets/markers/museum.png");
    case "art_gallery":
      return require("../../assets/markers/art_gallery.png");
    case "movie_theater":
      return require("../../assets/markers/movie_theater.png");
    case "performing_arts_theater":
      return require("../../assets/markers/performing_arts_theater.png");
    case "gym":
      return require("../../assets/markers/gym.png");
    case "bowling_alley":
      return require("../../assets/markers/bowling_alley.png");
    case "amusement_park":
      return require("../../assets/markers/amusement_park.png");
    case "spa":
      return require("../../assets/markers/spa.png");
    case "shopping_mall":
      return require("../../assets/markers/shopping_mall.png");
    case "market":
      return require("../../assets/markers/market.png");
    case "library":
      return require("../../assets/markers/library.png");
    case "coworking_space":
      return require("../../assets/markers/coworking_space.png");
    default:
      return require("../../assets/markers/default.png");
  }
};

export default function MapScreen() {
  useEffect(() => {
    // Preload marker assets so map pins appear instantly on first render.
    void Asset.loadAsync([...MARKER_ICON_MODULES]);
  }, []);

  // Map/business state comes from custom hook to keep screen mostly UI-focused.
  const {
    activeFilters,
    addRecentSearch,
    clearRecentSearches,
    clusteredMarkers,
    currentZoom,
    errorMessage,
    filteredMarkers,
    getClusterMarkerById,
    isFetchingDetails,
    isFilterModalVisible,
    isLoadingPlaces,
    isSearchActive,
    isVerifiedOnly,
    locationPermissionDenied,
    locateUser,
    recentSearches,
    onCameraMove,
    resetFilters,
    searchQuery,
    searchResults,
    selectMarkerById,
    selectedMarker,
    selectedTabs,
    setIsFilterModalVisible,
    setIsSearchActive,
    setIsVerifiedOnly,
    setSearchQuery,
    setSelectedMarker,
    toggleFilter,
    toggleQuickTab,
    userLocation,
    loadPlaces,
    totalPlacesInViewport,
  } = useExperienceMap();

  // Local refs/animations that belong to UI rendering concerns only.
  const mapRef = useRef<any>(null);
  const searchInputRef = useRef<TextInput>(null);
  const galleryScrollRef = useRef<ScrollView>(null);
  const hasAutoCenteredRef = useRef(false);
  const pendingCameraRef = useRef<{
    latitude: number;
    longitude: number;
    zoom: number;
    duration: number;
  } | null>(null);
  const [initialCamera, setInitialCamera] = React.useState(
    () =>
      persistedMapCamera || {
        coordinates: INITIAL_REGION,
        zoom: 14,
      },
  );
  const [sheetDragY, setSheetDragY] = React.useState(0);
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);

  const iconRestaurant = useImage(
    getEmojiIconSourceForType("restaurant", false),
  );
  const iconCafe = useImage(getEmojiIconSourceForType("cafe", false));
  const iconBar = useImage(getEmojiIconSourceForType("bar", false));
  const iconBakery = useImage(getEmojiIconSourceForType("bakery", false));
  const iconTakeaway = useImage(
    getEmojiIconSourceForType("meal_takeaway", false),
  );
  const iconPark = useImage(getEmojiIconSourceForType("park", false));
  const iconAttraction = useImage(
    getEmojiIconSourceForType("tourist_attraction", false),
  );
  const iconCampground = useImage(
    getEmojiIconSourceForType("campground", false),
  );
  const iconHike = useImage(getEmojiIconSourceForType("hiking_area", false));
  const iconZoo = useImage(getEmojiIconSourceForType("zoo", false));
  const iconAquarium = useImage(getEmojiIconSourceForType("aquarium", false));
  const iconMuseum = useImage(getEmojiIconSourceForType("museum", false));
  const iconGallery = useImage(getEmojiIconSourceForType("art_gallery", false));
  const iconMovie = useImage(getEmojiIconSourceForType("movie_theater", false));
  const iconTheater = useImage(
    getEmojiIconSourceForType("performing_arts_theater", false),
  );
  const iconGym = useImage(getEmojiIconSourceForType("gym", false));
  const iconBowling = useImage(
    getEmojiIconSourceForType("bowling_alley", false),
  );
  const iconAmusement = useImage(
    getEmojiIconSourceForType("amusement_park", false),
  );
  const iconSpa = useImage(getEmojiIconSourceForType("spa", false));
  const iconMall = useImage(getEmojiIconSourceForType("shopping_mall", false));
  const iconMarket = useImage(getEmojiIconSourceForType("market", false));
  const iconLibrary = useImage(getEmojiIconSourceForType("library", false));
  const iconCowork = useImage(
    getEmojiIconSourceForType("coworking_space", false),
  );
  const iconUser = useImage(require("../../assets/markers/user.png"));
  const iconCluster = useImage(getEmojiIconSourceForType(undefined, true));
  const iconDefault = useImage(getEmojiIconSourceForType(undefined, false));

  const isCameraCancellationError = React.useCallback((error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error ?? "");
    return /Animation cancelled|CancellationException/i.test(message);
  }, []);

  const runCameraCommand = React.useCallback(
    (operation: () => unknown) => {
      try {
        const result = operation();
        if (result && typeof (result as Promise<unknown>).then === "function") {
          void (result as Promise<unknown>).catch((error) => {
            if (!isCameraCancellationError(error)) {
              console.warn("Camera command failed", error);
            }
          });
        }
      } catch (error) {
        if (!isCameraCancellationError(error)) {
          console.warn("Camera command failed", error);
        }
      }
    },
    [isCameraCancellationError],
  );

  const markerIconByType = useMemo(
    () => ({
      restaurant: iconRestaurant,
      cafe: iconCafe,
      bar: iconBar,
      bakery: iconBakery,
      meal_takeaway: iconTakeaway,
      park: iconPark,
      tourist_attraction: iconAttraction,
      campground: iconCampground,
      hiking_area: iconHike,
      zoo: iconZoo,
      aquarium: iconAquarium,
      museum: iconMuseum,
      art_gallery: iconGallery,
      movie_theater: iconMovie,
      performing_arts_theater: iconTheater,
      gym: iconGym,
      bowling_alley: iconBowling,
      amusement_park: iconAmusement,
      spa: iconSpa,
      shopping_mall: iconMall,
      market: iconMarket,
      library: iconLibrary,
      coworking_space: iconCowork,
      user: iconUser,
      cluster: iconCluster,
      default: iconDefault,
    }),
    [
      iconAmusement,
      iconAquarium,
      iconAttraction,
      iconBakery,
      iconBar,
      iconBowling,
      iconCafe,
      iconCampground,
      iconCluster,
      iconCowork,
      iconDefault,
      iconGallery,
      iconGym,
      iconHike,
      iconLibrary,
      iconMall,
      iconMarket,
      iconMovie,
      iconMuseum,
      iconPark,
      iconRestaurant,
      iconSpa,
      iconTakeaway,
      iconTheater,
      iconUser,
      iconZoo,
    ],
  );

  const markersForMap = useMemo(
    () => [
      ...clusteredMarkers.map((place) => ({
        id: String(place.id),
        coordinates: place.coordinates,
        title: place.isCluster ? `${place.count} experiences` : place.title,
        snippet: place.snippet,
        icon: place.isCluster
          ? markerIconByType.cluster || markerIconByType.default
          : markerIconByType[place.typeTag as keyof typeof markerIconByType] ||
            markerIconByType.default,
      })),
      ...(userLocation
        ? [{
            id: "user-pos",
            coordinates: userLocation,
            title: "🧍 You",
            icon: markerIconByType.user || markerIconByType.default,
          }]
        : []),
    ],
    [clusteredMarkers, markerIconByType, userLocation],
  );

  const rememberCamera = React.useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      persistedMapCamera = {
        coordinates: { latitude, longitude },
        zoom,
      };
    },
    [],
  );

  const centerMapOn = React.useCallback(
    (lat: number, lng: number, zoom = 16, retryCount = 0) => {
      rememberCamera(lat, lng, zoom);
      pendingCameraRef.current = {
        latitude: lat,
        longitude: lng,
        zoom,
        duration: 1000,
      };

      if (mapRef.current?.moveCamera) {
        runCameraCommand(() =>
          mapRef.current.moveCamera({
            cameraPosition: {
              coordinates: { latitude: lat, longitude: lng },
              zoom,
            },
            duration: 1000,
          }),
        );
      } else if (mapRef.current?.setCameraPosition) {
        runCameraCommand(() =>
          mapRef.current.setCameraPosition({
            coordinates: { latitude: lat, longitude: lng },
            zoom,
            duration: 1000,
          }),
        );
      } else if (retryCount < 20) {
        setTimeout(() => centerMapOn(lat, lng, zoom, retryCount + 1), 100);
      }
    },
    [rememberCamera, runCameraCommand],
  );

  const handleMapReady = () => {
    const queuedCamera = pendingCameraRef.current;
    if (queuedCamera) {
      if (mapRef.current?.moveCamera) {
        runCameraCommand(() =>
          mapRef.current.moveCamera({
            cameraPosition: {
              coordinates: {
                latitude: queuedCamera.latitude,
                longitude: queuedCamera.longitude,
              },
              zoom: queuedCamera.zoom,
            },
            duration: queuedCamera.duration,
          }),
        );
        pendingCameraRef.current = null;
        return;
      }
      if (mapRef.current?.setCameraPosition) {
        runCameraCommand(() =>
          mapRef.current.setCameraPosition({
            coordinates: {
              latitude: queuedCamera.latitude,
              longitude: queuedCamera.longitude,
            },
            zoom: queuedCamera.zoom,
            duration: queuedCamera.duration,
          }),
        );
        pendingCameraRef.current = null;
        return;
      }
    }

    const nextCamera = persistedMapCamera || initialCamera;
    if (mapRef.current?.moveCamera) {
      runCameraCommand(() =>
        mapRef.current.moveCamera({
          cameraPosition: {
            coordinates: nextCamera.coordinates,
            zoom: nextCamera.zoom,
          },
          duration: 0,
        }),
      );
    } else if (mapRef.current?.setCameraPosition) {
      runCameraCommand(() =>
        mapRef.current.setCameraPosition({
          coordinates: nextCamera.coordinates,
          zoom: nextCamera.zoom,
          duration: 0,
        }),
      );
    }
  };

  useEffect(() => {
    if (isSearchActive) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchActive]);

  useEffect(() => {
    if (selectedMarker) {
      setSheetDragY(0);
      setIsSheetExpanded(false);
      setActivePhotoIndex(0);
    }
  }, [selectedMarker]);

  const closeInfoSheet = React.useCallback(() => {
    setSheetDragY(0);
    setIsSheetExpanded(false);
    setSelectedMarker(null);
  }, [setSelectedMarker]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          const clamped = Math.max(-220, Math.min(260, gestureState.dy));
          setSheetDragY(clamped);
        },
        onPanResponderRelease: (_, gestureState) => {
          // Swipe up expands the sheet and reveals more details.
          if (gestureState.dy < -80 || gestureState.vy < -1.1) {
            setIsSheetExpanded(true);
            setSheetDragY(0);
            return;
          }

          // Swipe down closes directly as requested.
          if (gestureState.dy > 100 || gestureState.vy > 1.1) {
            closeInfoSheet();
            return;
          }

          setSheetDragY(0);
        },
        onPanResponderTerminate: () => {
          setSheetDragY(0);
        },
      }),
    [closeInfoSheet],
  );

  useEffect(() => {
    // Auto-locate once on component mount.
    if (hasAutoCenteredRef.current) return;
    hasAutoCenteredRef.current = true;

    void (async () => {
      const coordinates = await locateUser(true);
      if (coordinates) {
        setInitialCamera({
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          },
          zoom: 16,
        });
        centerMapOn(coordinates.latitude, coordinates.longitude, 16);
      }
    })();
  }, [centerMapOn, locateUser]);

  const handleCameraMovePersist = React.useCallback(
    (event: any) => {
      const coordinates = event?.coordinates;
      const zoom = event?.zoom;
      if (
        coordinates &&
        typeof coordinates.latitude === "number" &&
        typeof coordinates.longitude === "number" &&
        typeof zoom === "number"
      ) {
        rememberCamera(coordinates.latitude, coordinates.longitude, zoom);
      }
      onCameraMove(event);
    },
    [onCameraMove, rememberCamera],
  );

  const closeFilterModal = React.useCallback(() => {
    setIsFilterModalVisible(false);
  }, [setIsFilterModalVisible]);

  const handleLocateMe = async () => {
    // Always use custom locate flow and center camera on resolved user position.
    const coordinates = await locateUser(true);
    if (coordinates) {
      centerMapOn(coordinates.latitude, coordinates.longitude, 18);
      return;
    }

    if (locationPermissionDenied) {
      void Linking.openSettings();
    }
  };

  const openSearch = () => {
    setIsSearchActive(true);
    setSelectedMarker(null);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const handleMarkerClick = async (event: any) => {
    const clickedId = event?.id || event?.nativeEvent?.id || event?.payload?.id;
    if (!clickedId) return;

    if (String(clickedId).startsWith("cluster:")) {
      // Cluster taps zoom in toward cluster center instead of opening detail sheet.
      const cluster = getClusterMarkerById(String(clickedId));
      if (!cluster) return;

      centerMapOn(
        cluster.coordinates.latitude,
        cluster.coordinates.longitude,
        Math.min(20, currentZoom + 2),
      );
      return;
    }

    setSearchQuery("");
    setIsSearchActive(false);
    Keyboard.dismiss();

    const resolvedMarker = await selectMarkerById(String(clickedId));
    if (resolvedMarker) {
      centerMapOn(
        resolvedMarker.geometry.location.lat,
        resolvedMarker.geometry.location.lng,
      );
    }
  };

  const selectFromSearch = (place: GooglePlace) => {
    setSearchQuery("");
    setIsSearchActive(false);
    setSelectedMarker(place);
    Keyboard.dismiss();
    centerMapOn(place.geometry.location.lat, place.geometry.location.lng);
    addRecentSearch(place.name);
  };

  if (Platform.OS === "ios") {
    return <AppleMaps.View style={{ flex: 1 }} />;
  }

  if (Platform.OS !== "android") {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-slate-900">
        <Text className="text-white">
          Maps are only available on iOS and Android.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      {/* Base map layer */}
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
        onCameraMove={handleCameraMovePersist}
        onMarkerClick={handleMarkerClick}
        uiSettings={{
          zoomControlsEnabled: false,
          mapToolbarEnabled: false,
          myLocationButtonEnabled: false,
        }}
        {...({ googleMapsMapId: MY_MAP_ID } as any)}
        properties={{ isMyLocationEnabled: true }}
        markers={markersForMap}
      />

      {/* Top controls + floating action area */}
      <SafeAreaView
        className="flex-col justify-between flex-1 px-4 "
        pointerEvents="box-none"
      >
        <View
          className={`${isSearchActive ? "absolute inset-0 bg-white z-[10000] px-4 pt-4  " : "gap-4"}`}
          style={
            isSearchActive
              ? { height: SCREEN_HEIGHT, width: SCREEN_WIDTH, left: 0, top: 0 }
              : undefined
          }
        >
          {locationPermissionDenied && !isSearchActive && (
            <View className="flex-row items-start p-3 bg-white border border-orange-200 rounded-xl">
              <Ionicons name="warning-outline" size={20} color="#f97316" />
              <View className="flex-1 ml-2">
                <Text className="text-sm font-semibold text-gray-800">
                  Location access is off
                </Text>
                <Text className="text-xs text-gray-600">
                  Enable it for better nearby results.
                </Text>
                <TouchableOpacity
                  className="mt-1"
                  onPress={() => Linking.openSettings()}
                >
                  <Text className="text-xs font-bold text-orange-600">
                    Open Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!!errorMessage && !isSearchActive && (
            <View className="flex-row items-center justify-between p-3 bg-white border border-red-200 rounded-xl">
              <View className="flex-row items-center flex-1">
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#dc2626"
                />
                <Text className="ml-2 text-xs font-semibold text-red-600">
                  {errorMessage}
                </Text>
              </View>
              <TouchableOpacity onPress={() => void loadPlaces()}>
                <Text className="text-xs font-bold text-orange-600">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search bar not active */}
          <View
            className="flex-row items-center bg-white shadow-2xl rounded-2xl"
            style={{ elevation: 10 }}
          >
            <TouchableOpacity
              className="items-center justify-center w-12 h-16"
              activeOpacity={0.8}
              onPress={() => {
                if (isSearchActive) {
                  closeSearch();
                } else {
                  openSearch();
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
              ref={searchInputRef}
              className="flex-1 h-16 text-xl"
              placeholder={isLoadingPlaces ? "Loading..." : "Search markers..."}
              placeholderTextColor="#ccc"
              value={searchQuery}
              onFocus={openSearch}
              onChangeText={setSearchQuery}
            />

            {isSearchActive && searchQuery.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSearchQuery("")}
                className="px-2"
              >
                <Ionicons name="close-circle" size={20} color="#ccc" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              className="items-center justify-center w-12 h-16"
              onPress={() => setIsFilterModalVisible(true)}
            >
              <Ionicons name="options" size={24} color="#f54900" />
            </TouchableOpacity>
          </View>

          {/* Search bar active */}
          {isSearchActive ? (
            <Animated.View
              entering={FadeInDown.duration(250)}
              exiting={FadeOutDown.duration(180)}
              style={{ flex: 1 }}
            >
              <ScrollView className="flex-1 mt-4">
                {searchQuery.length > 0 ? (
                  <>
                    {searchResults.length === 0 ? (
                      <View className="items-center justify-center pt-20">
                        <Ionicons
                          name="alert-circle-outline"
                          size={40}
                          color="#eee"
                        />
                        <Text className="mt-2 text-gray-400">
                          No places match &quot;{searchQuery}&quot;
                        </Text>
                      </View>
                    ) : (
                      searchResults.map((item) => (
                        <TouchableOpacity
                          key={item.place_id}
                          className="flex-row items-center p-4 border-b border-gray-100"
                          onPress={() => selectFromSearch(item)}
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
                      ))
                    )}
                  </>
                ) : (
                  <View>
                    {recentSearches.length > 0 && (
                      <View className="mb-6">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                            Recent Searches
                          </Text>
                          <TouchableOpacity onPress={clearRecentSearches}>
                            <Text className="text-xs font-bold text-orange-500">
                              CLEAR
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {recentSearches.map((term) => (
                          <TouchableOpacity
                            key={term}
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
            // Quick tabs //
            <View className="flex-row ">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {QUICK_TABS.map((item) => {
                  const isActive = selectedTabs.includes(item);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      key={item}
                      onPress={() => toggleQuickTab(item)}
                      className={`px-6 py-2 rounded-full ${isActive ? "bg-orange-600" : "bg-white"}`}
                      style={{ elevation: 5 }}
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
          )}
        </View>

        {/* Bottom controls */}
        {!isSearchActive && (
          <View className="flex-row-reverse justify-between">
            {/* Quick actions */}
            <View className="flex-col gap-4 mb-4 ">
              <TouchableOpacity
                activeOpacity={0.87}
                className="items-center self-end justify-center w-12 h-12 bg-orange-500 rounded-full"
                style={{ elevation: 8 }}
                onPress={() => router.push("/(tabs)/myExperience")}
              >
                <Ionicons name="add" size={23} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.87}
                className="items-center self-end justify-center w-12 h-12 bg-white rounded-full"
                style={{ elevation: 8 }}
                onPress={() => {
                  void handleLocateMe();
                }}
              >
                <Ionicons name="locate" size={23} color="#f54900" />
              </TouchableOpacity>
            </View>

            {/* Total places in viewport */}
            <View className="items-center self-end justify-center w-auto px-3 py-2 mb-4 text-center bg-white rounded-full h-9">
              <Text className="text-xs font-semibold text-gray-700">
                Showing {totalPlacesInViewport} places
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Global loading overlay for marker fetch */}
      {isLoadingPlaces && filteredMarkers.length === 0 && (
        <View className="absolute inset-0 items-center justify-center bg-black/10">
          <View className="flex-row items-center px-4 py-3 bg-white rounded-full">
            <ActivityIndicator size="small" color="#f54900" />
            <Text className="ml-2 font-semibold text-gray-700">
              Loading experiences...
            </Text>
          </View>
        </View>
      )}

      {/* Bottom details sheet for selected marker */}
      {selectedMarker && (
        <Animated.View
          entering={SlideInDown.duration(240).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(300)}
          className="absolute bottom-0 w-full overflow-hidden bg-white rounded-t-3xl"
          style={{
            elevation: 35,
            zIndex: 9999,
            top: isSheetExpanded ? 0 : undefined,
            transform: [{ translateY: sheetDragY }],
            maxHeight: isSheetExpanded ? SCREEN_HEIGHT : SCREEN_HEIGHT * 0.58,
            borderTopLeftRadius: isSheetExpanded ? 0 : 24,
            borderTopRightRadius: isSheetExpanded ? 0 : 24,
          }}
          {...sheetPanResponder.panHandlers}
        >
          <>
            <View className="items-center pt-2 pb-1">
              <View className="w-12 h-1.5 rounded-full bg-gray-300" />
              <Text className="mt-1 text-[11px] text-gray-400">
                {isSheetExpanded ? "Swipe down to close" : "Swipe up for more details"}
              </Text>
            </View>

            <View
              className={`w-full bg-gray-200 ${isSheetExpanded ? "h-72" : "h-52"}`}
            >
              {isFetchingDetails ? (
                <View className="items-center justify-center w-full h-full">
                  <ActivityIndicator size="large" color="#f54900" />
                </View>
              ) : selectedMarker.photos && selectedMarker.photos.length > 0 ? (
                <>
                  <ScrollView
                    ref={galleryScrollRef}
                    horizontal
                    pagingEnabled
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                      const nextIndex = Math.round(
                        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                      );
                      setActivePhotoIndex(nextIndex);
                    }}
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

                  {selectedMarker.photos.length > 1 && (
                    <View className="absolute flex-row items-center px-2 py-1 rounded-full bottom-3 left-3 bg-black/45">
                      <Text className="text-xs font-semibold text-white">
                        {activePhotoIndex + 1}/{selectedMarker.photos.length}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View className="items-center justify-center w-full h-full">
                  <Ionicons name="image-outline" size={48} color="#ccc" />
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={closeInfoSheet}
                className="absolute p-2 rounded-full top-4 right-4 bg-white/80"
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View className="px-5 pt-4 pb-6">
              {!!selectedMarker.photos?.length && selectedMarker.photos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ gap: 8, paddingRight: 8 }}
                >
                  {selectedMarker.photos.slice(0, 8).map((photo, index) => {
                    const isActive = index === activePhotoIndex;
                    return (
                      <TouchableOpacity
                        key={`${photo.photo_reference}-${index}`}
                        activeOpacity={0.9}
                        onPress={() => {
                          setActivePhotoIndex(index);
                          galleryScrollRef.current?.scrollTo({
                            x: index * SCREEN_WIDTH,
                            animated: true,
                          });
                        }}
                        className={`overflow-hidden rounded-xl border-2 ${isActive ? "border-orange-500" : "border-transparent"}`}
                      >
                        <Image
                          source={{ uri: getPhotoUrl(photo.photo_reference) }}
                          style={{ width: 70, height: 70 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-[22px] font-bold text-gray-900"
                    numberOfLines={1}
                  >
                    {selectedMarker.name}
                  </Text>
                  <Text
                    className="mt-1 text-sm font-medium text-gray-500"
                    numberOfLines={1}
                  >
                    {(selectedMarker.types?.[0] || "experience").replaceAll(
                      "_",
                      " ",
                    )}
                  </Text>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center px-2 py-1 rounded-lg bg-amber-50">
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text className="ml-1 text-sm font-bold text-amber-700">
                      {selectedMarker.rating || "N/A"}
                    </Text>
                  </View>
                  {!!selectedMarker.user_ratings_total && (
                    <Text className="mt-1 text-xs text-gray-500">
                      {selectedMarker.user_ratings_total} reviews
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center mt-3">
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text className="ml-2 text-sm text-gray-700" numberOfLines={2}>
                  {selectedMarker.vicinity}
                </Text>
              </View>

              <View className="flex-row mt-5">
                <TouchableOpacity
                  className="items-center justify-center flex-1 py-3 mr-2 bg-gray-100 rounded-xl"
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedMarker.name)}&query_place_id=${selectedMarker.place_id}`,
                    )
                  }
                >
                  <Text className="font-semibold text-gray-800">
                    Directions
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="items-center justify-center flex-1 py-3 ml-2 bg-orange-600 rounded-xl"
                  onPress={() => router.push("/(tabs)/chat")}
                >
                  <Text className="font-bold text-white">Join Group Chat</Text>
                </TouchableOpacity>
              </View>

              <Text className="mt-4 text-xs text-gray-400">
                Info is sourced from Google Places and community activity.
              </Text>

              {isSheetExpanded && (
                <View className="pt-4 mt-4 border-t border-gray-100">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-semibold text-gray-900">
                      Experience Details
                    </Text>
                    <Text className="text-xs font-medium text-gray-500">
                      place id: {selectedMarker.place_id.slice(0, 8)}
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap gap-2">
                    {(selectedMarker.types || []).slice(0, 8).map((type) => (
                      <View
                        key={type}
                        className="px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200"
                      >
                        <Text className="text-xs font-medium text-gray-700">
                          {type.replaceAll("_", " ")}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text className="mt-3 text-xs leading-5 text-gray-500">
                    Discover this spot with nearby people, open the group chat,
                    and coordinate plans in real time.
                  </Text>
                </View>
              )}
            </View>
          </>
        </Animated.View>
      )}

      {/* Full-screen filter modal */}
      {isFilterModalVisible && (
        <Animated.View
          entering={SlideInRight.duration(200).easing(Easing.out(Easing.quad))}
          exiting={SlideOutRight.duration(200)}
          style={{ zIndex: 20000, width: SCREEN_WIDTH }}
          className="absolute inset-0 bg-white"
        >
          <SafeAreaView className="flex-1">
            <View className="flex-row-reverse items-center justify-between px-6 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={closeFilterModal}>
                <Ionicons name="close" size={25} color="#333" />
              </TouchableOpacity>
              <Text className="text-xl font-bold">Filters</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text className="font-semibold text-orange-600">Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 pt-4">
              <ActiveFiltersSummary
                filters={activeFilters}
                onRemove={toggleFilter}
              />
              <SectionTitle title="CATEGORY FILTERS" icon="options" />
              {FILTER_GROUPS.map((group) => (
                <FilterGroup
                  key={group.title}
                  title={group.title}
                  items={group.items}
                  activeFilters={activeFilters}
                  onToggle={toggleFilter}
                />
              ))}

              <View className="h-px my-6 bg-gray-100" />

              <SectionTitle title="SMART FILTERS" icon="filter-outline" />
              {SMART_FILTER_GROUPS.map((group) => (
                <FilterGroup
                  key={group.title}
                  title={group.title}
                  items={group.items}
                  activeFilters={activeFilters}
                  onToggle={toggleFilter}
                />
              ))}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsVerifiedOnly(!isVerifiedOnly)}
                className="flex-row items-center justify-between px-4 py-4 mt-4 mb-10 bg-gray-50 rounded-xl"
              >
                <View>
                  <Text className="font-bold text-gray-800">Verified Only</Text>
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

            <View className="px-6 py-4 bg-white border-t border-gray-100">
              <TouchableOpacity
                onPress={closeFilterModal}
                className="items-center py-4 bg-orange-600 shadow-lg rounded-2xl"
              >
                <Text className="text-lg font-bold text-white">
                  Apply Filters ({filteredMarkers.length} results)
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </>
  );
}
