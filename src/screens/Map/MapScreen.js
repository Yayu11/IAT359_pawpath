import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Geocoder from "react-native-geocoding";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

//Call Firebase Cloud Functions from React Native
import { httpsCallable } from "firebase/functions";
//Import initialized Firebase Cloud Functions
import { firebase_functions } from "../../firebaseConfig";

import {
  ActivityIndicator, // loading indicator while reteriving park data
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import PlacePhoto from "../../components/PlacePhoto";
import PlaceInfo from "../../components/PlaceInfo";

import {
  getFavourites,
  saveFavourite,
  removeFavourite,
  calculateDistance,
} from "../../utils/favouriteStorage";

export default function MapScreen({ navigation }) {
  // Google Maps API Key from .env
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;

  // map and location states
  // Stores user's current GPS location
  const [currentLocation, setCurrentLocation] = useState(null);

  // Stores the text entered in the search bar
  const [searchLocation, setSearchLocation] = useState("");

  // Tracks whether location permission was granted
  const [locationGranted, setLocationGranted] = useState(false);

  //Stores coordinates of the currently searched area, This can be different from the user's GPS location
  const [searchCenter, setSearchCenter] = useState(null);

  // Track text-based location search
  const [searchingLocation, setSearchingLocation] = useState(false);

  // Reference to MapView for camera animation
  const mapRef = useRef(null);

  // --------------------------------------------------
  // Firestore favourites
  const [savedIds, setSavedIds] = useState([]);
  // Prevents repeated favourite updates
  const [updatingId, setUpdatingId] = useState(null);

  // --------------------------------------------------
  // Real Google Places data
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState("");

  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");

  // Prevent duplicate requests and cache results in this screen.
  const loadingRef = useRef(false); // Prevent simultaneous nearby place requests
  const lastSearchRef = useRef(null); // Remember last successful search
  const requestIdRef = useRef(0); // Track API request identity
  const searchingRef = useRef(false); // Prevent simultaneous geocoding searches

  // --------------------------------------------------
  // Initialize Google Geocoder (Same implementation as lecture demo)
  useEffect(() => {
    if (apiKey) {
      Geocoder.init(apiKey);
    } else {
      console.warn("Google Maps API key is missing");
    }
  }, [apiKey]);

  // --------------------------------------------------
  // Move map to a location
  const focusMap = useCallback((latitude, longitude, zoom = 15) => {
    mapRef.current?.animateCamera(
      {
        center: {
          latitude,
          longitude,
        },
        zoom,
      },
      { duration: 1000 },
    );
  }, []);

  // --------------------------------------------------
  // Retrieve real parks from Firebase Cloud Functions
  const fetchNearbyPlaces = useCallback(
    async (latitude, longitude, forceRefresh = false) => {
      // Validate GPS coordinates before making request
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      ) {
        return;
      }

      // Prevent simultaneous API requests
      if (loadingRef.current) return;

      // Avoid calling the API again for almost the same location
      // within five minutes, unless the user presses Refresh.
      const previousSearch = lastSearchRef.current;

      if (previousSearch && !forceRefresh) {
        const distance = calculateDistance(
          previousSearch.latitude,
          previousSearch.longitude,
          latitude,
          longitude,
        );

        const elapsedTime = Date.now() - previousSearch.time;

        if (
          Number.isFinite(distance) &&
          distance < 0.5 &&
          elapsedTime < 5 * 60 * 1000
        ) {
          return;
        }
      }

      loadingRef.current = true;
      setLoadingPlaces(true);
      setPlacesError("");

      // Remember which area is being searched
      setSearchCenter({
        latitude,
        longitude,
      });

      //  Clear previous marker selection
      setSelectedPlaceId(null);

      // Clear old results when searching a new area
      setPlaces([]);

      const requestId = ++requestIdRef.current;

      try {
        //Reference deployed Firebase Cloud Function
        const getNearbyParks = httpsCallable(
          firebase_functions,
          "getNearbyParks",
        );

        // Send GPS coordinates to Firebase
        const result = await getNearbyParks({
          latitude,
          longitude,
        });

        const returnedPlaces = result.data?.places ?? [];

        // Only accept places with valid coordinates.
        //Convert Google Places results into PawPath objects
        const validPlaces = returnedPlaces
          .filter(
            (place) =>
              place.id &&
              Number.isFinite(place.latitude) &&
              Number.isFinite(place.longitude),
          )
          .map((place) => ({
            id: place.id,
            name: place.name || "Unnamed Place",
            type: place.type === "Trail" ? "Trail" : "Park",
            latitude: place.latitude,
            longitude: place.longitude,
            source: "google",

            // ------------------------------------------
            // Photo metadata for PlacePhoto.js
            // Google photo resource name (This is NOT the actual image URL)
            photoName: place.photoName ?? null,

            // Photo author attribution information
            photoAttributions: place.photoAttributions ?? [],

            // Link to original photo on Google Maps
            photoGoogleMapsUri: place.photoGoogleMapsUri ?? null,
            attributions: place.attributions ?? [],

            // ------------------------------------------
            // Calculate distance from searched location
            distanceKm: calculateDistance(
              latitude,
              longitude,
              place.latitude,
              place.longitude,
            ),
          }))
          // Sort parks by straight-line distance
          .sort((a, b) => a.distanceKm - b.distanceKm);

        // Ignore outdated API response
        if (requestId !== requestIdRef.current) return;

        // Store results in React state
        setPlaces(validPlaces);

        // Remember the last successful search
        lastSearchRef.current = {
          latitude,
          longitude,
          time: Date.now(),
        };

        // Display result counts in the terminal
        const parkCount = validPlaces.filter(
          (place) => place.type === "Park",
        ).length;

        const trailCount = validPlaces.filter(
          (place) => place.type === "Trail",
        ).length;

        console.log(`Loaded ${parkCount} parks and ${trailCount} trails.`);
        // Temporary testing logs
        console.log(
          "Places with photos:",
          validPlaces.filter((place) => place.photoName).length,
        );

        console.log(
          "Places without photos:",
          validPlaces.filter((place) => !place.photoName).length,
        );

        console.log(
          "Trail results:",
          validPlaces
            .filter((place) => place.type === "Trail")
            .map((place) => place.name),
        );
      } catch (error) {
        console.error("Google Places error:", error.code, error.message);

        if (requestId === requestIdRef.current) {
          setPlaces([]);

          // Allow retry after failed request
          lastSearchRef.current = null;

          setPlacesError("Unable to load nearby parks and trails.");
        }
      } finally {
        loadingRef.current = false;

        if (requestId === requestIdRef.current) {
          setLoadingPlaces(false);
        }
      }
    },
    [],
  );

  // --------------------------------------------------
  // Request GPS permission and retrieve current location
  useEffect(() => {
    let active = true;

    async function getCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!active) return;

        if (status !== "granted") {
          console.log("Location permission denied");
          return;
        }

        setLocationGranted(true);

        const location = await Location.getCurrentPositionAsync({});

        if (!active) return;

        setCurrentLocation(location);

        const { latitude, longitude } = location.coords;

        console.log(`Current location: lat: ${latitude}, lng: ${longitude}`);

        // Do not interrupt a manual search
        // if GPS initialization finishes later
        if (
          searchingRef.current ||
          loadingRef.current ||
          lastSearchRef.current
        ) {
          return;
        }

        focusMap(latitude, longitude);

        // Automatically retrieve nearby parks once.
        // using the user's current GPS coordinates
        await fetchNearbyPlaces(latitude, longitude);
      } catch (error) {
        console.warn("Location Error:", error);
      }
    }

    getCurrentLocation();

    return () => {
      active = false;
    };
  }, [fetchNearbyPlaces, focusMap]);

  // --------------------------------------------------
  // Search for a location using Google Geocoding
  async function performSearch() {
    // Prevent overlapping search requests
    if (loadingRef.current || searchingRef.current) {
      return;
    }

    if (!searchLocation.trim()) {
      Alert.alert("Search", "Please enter a location.");
      return;
    }

    if (!apiKey) {
      Alert.alert("Error", "Google Maps API key is missing.");
      return;
    }

    try {
      // Indicate that geocoding is in progress
      searchingRef.current = true;
      setSearchingLocation(true);
      Keyboard.dismiss();

      // Convert searched address into coordinates
      const json = await Geocoder.from(searchLocation.trim());

      if (!json.results || json.results.length === 0) {
        Alert.alert("Not Found", "Location not found.");
        return;
      }

      const location = json.results[0].geometry.location;

      // Use reusable function to move the map
      focusMap(location.lat, location.lng);

      // Retrieve parks around the searched location.
      await fetchNearbyPlaces(location.lat, location.lng);
    } catch (error) {
      console.warn("Geocoding Error:", error);

      Alert.alert("Search Error", "Unable to find this location.");
    } finally {
      // Reset search loading state
      searchingRef.current = false;
      setSearchingLocation(false);
    }
  }

  // --------------------------------------------------
  // Move map to current GPS location
  async function goToCurrentLocation() {
    if (loadingRef.current || searchingRef.current) {
      return;
    }

    if (!currentLocation) {
      Alert.alert(
        "Location Unavailable",
        "Current location is not available yet.",
      );
      return;
    }

    const { latitude, longitude } = currentLocation.coords;

    setSearchLocation("");

    focusMap(latitude, longitude);

    await fetchNearbyPlaces(latitude, longitude);
  }

  // --------------------------------------------------
  // Manually refresh nearby parks
  async function refreshPlaces() {
    if (loadingRef.current || searchingRef.current) {
      return;
    }

    // Refresh the currently searched area.
    // If no area was searched, use current GPS location.
    const location = searchCenter ?? currentLocation?.coords;

    if (!location) {
      Alert.alert(
        "Location Unavailable",
        "Please search for a location first.",
      );

      return;
    }

    const { latitude, longitude } = location;

    // forceRefresh = true bypasses the five-minute check
    await fetchNearbyPlaces(latitude, longitude, true);
  }

  // --------------------------------------------------
  // Load saved places from Firestore
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadSavedPlaces() {
        try {
          const favourites = await getFavourites();

          if (active) {
            setSavedIds(favourites.map((place) => place.id));
          }
        } catch (error) {
          console.log("Favourite loading error:", error);
        }
      }

      loadSavedPlaces();

      return () => {
        active = false;
      };
    }, []),
  );

  // --------------------------------------------------
  // Save or remove a favourite
  async function toggleFavourite(place) {
    if (updatingId !== null) return;

    try {
      setUpdatingId(place.id);

      if (savedIds.includes(place.id)) {
        await removeFavourite(place.id);

        setSavedIds((previous) => previous.filter((id) => id !== place.id));
      } else {
        await saveFavourite(place);

        setSavedIds((previous) => [...previous, place.id]);
      }
    } catch (error) {
      console.log("Favourite error:", error.code, error.message);

      Alert.alert(
        "Error",
        error.code === "permission-denied"
          ? "You don't have permission to save this place."
          : "Unable to update saved places.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // --------------------------------------------------
  // Select a park on the map
  function selectPlace(place) {
    setSelectedPlaceId(place.id);

    focusMap(place.latitude, place.longitude, 16);
  }

  // --------------------------------------------------
  // Filter real GOOGLE PLACES results
  const filteredPlaces = places.filter((place) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Parks") return place.type === "Park";
    if (activeFilter === "Trails") return place.type === "Trail";

    return true;
  });

  const suggestedPlaces = filteredPlaces.slice(0, 4);
  // Combined loading condition
  const isBusy = loadingPlaces || searchingLocation;

  return (
    <View style={styles.container}>
      {/* Search bar and Saved Places */}
      <View style={styles.topSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#888" />

            <TextInput
              style={styles.searchInput}
              placeholder="Search for location"
              placeholderTextColor="#AAA"
              value={searchLocation}
              onChangeText={setSearchLocation}
              onSubmitEditing={performSearch}
              returnKeyType="search"
            />

            <Pressable
              onPress={performSearch}
              disabled={isBusy}
              accessibilityLabel="Search location"
            >
              {searchingLocation ? (
                <ActivityIndicator size="small" color="#8F9E42" />
              ) : (
                <Ionicons
                  name="arrow-forward-circle"
                  size={23}
                  color="#8F9E42"
                />
              )}
            </Pressable>
          </View>

          <Pressable
            style={styles.savedButton}
            onPress={() =>
              navigation.navigate("SavedFavourite", { places, searchCenter })
            }
          >
            <Ionicons name="heart-outline" size={17} color="#333" />

            <Text style={styles.savedText}>Saved</Text>
          </Pressable>
        </View>

        {/* Real data filters */}
        <View style={styles.filterRow}>
          {["All", "Parks", "Trails"].map((filter) => (
            <Pressable
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.activeFilterButton,
              ]}
              onPress={() => {
                setActiveFilter(filter);
                setSelectedPlaceId(null);
              }}
            >
              <Text style={styles.filterText}>{filter}</Text>
            </Pressable>
          ))}

          {/* Difficulty requires trail metadata. */}
          {/* <View style={[styles.filterButton, styles.disabledFilter]}>
            <Text style={styles.filterText}>Difficulty⌄</Text>
          </View> */}
        </View>
      </View>

      {/* Interactive map with real park markers */}
      <MapView
        style={styles.map}
        ref={mapRef}
        // provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 49.19418,
          longitude: -123.17505,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        mapType="satellite"
      >
        {/* Custom park and trail markers */}
        {filteredPlaces.map((place) => {
          const isSelected = selectedPlaceId === place.id;
          const isTrail = place.type === "Trail";

          return (
            <Marker
              key={place.id}
              identifier={place.id}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              title={place.name}
              description={
                Number.isFinite(place.distanceKm)
                  ? `${place.distanceKm.toFixed(1)} km from search area`
                  : place.type
              }
              onPress={() => setSelectedPlaceId(place.id)}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={true}
              zIndex={isSelected ? 10 : 1}
            >
              {/* Custom marker appearance */}
              <View
                style={[
                  styles.customMarker,
                  {
                    backgroundColor: isSelected
                      ? "#F46C6C"
                      : isTrail
                        ? "#D88B45"
                        : "#8F9E42",
                  },
                ]}
              >
                {isTrail ? (
                  <Ionicons name="footsteps" size={23} color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons
                    name="pine-tree"
                    size={25}
                    color="#FFFFFF"
                  />
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Current GPS location button */}
      <Pressable
        style={[styles.locationButton, isBusy && styles.disabledButton]}
        onPress={goToCurrentLocation}
        disabled={isBusy}
        accessibilityLabel="Go to current location"
      >
        <Ionicons name="locate-outline" size={24} color="#333" />
      </Pressable>

      {/* Refresh nearby parks */}
      <Pressable
        style={[
          styles.refreshButton,
          (isBusy || (!searchCenter && !currentLocation)) &&
            styles.disabledButton,
        ]}
        onPress={refreshPlaces}
        disabled={isBusy || (!searchCenter && !currentLocation)}
        accessibilityLabel="Refresh nearby places"
      >
        {loadingPlaces ? (
          <ActivityIndicator size="small" color="#333" />
        ) : (
          <Ionicons name="refresh-outline" size={23} color="#333" />
        )}
      </Pressable>

      {/* Suggested real places */}
      <View style={styles.suggestionsSection}>
        <View style={styles.suggestionsHeader}>
          <Text style={styles.sectionTitle}>Place you might like</Text>

          <Pressable
            onPress={() =>
              navigation.navigate("ChooseLocation", {
                places,
                searchCenter,
              })
            }
          >
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        {/* Loading state */}
        {isBusy && suggestedPlaces.length === 0 ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator color="#8F9E42" />

            <Text style={styles.statusText}>
              Finding nearby parks and trails...
            </Text>
          </View>
        ) : // Error State
        placesError && places.length === 0 ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{placesError}</Text>
            <Pressable onPress={refreshPlaces}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : // Empty Results
        suggestedPlaces.length === 0 ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {!searchCenter
                ? "Search for a location to discover nearby places."
                : activeFilter === "Trails"
                  ? "No nearby trails found."
                  : activeFilter === "Parks"
                    ? "No nearby parks found."
                    : "No nearby parks or trails found."}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardList}
          >
            {suggestedPlaces.map((place) => (
              <Pressable
                key={place.id}
                style={[
                  styles.placeCard,
                  selectedPlaceId === place.id && styles.selectedCard,
                ]}
                onPress={() => selectPlace(place)}
              >
                {/* Placeholder until park photo API is added */}
                <View style={styles.imageContainer}>
                  <PlacePhoto place={place} style={styles.placePhoto} />

                  {/* Park / Trails category */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          place.type === "Trail" ? "#F6DEBF" : "#D4D88E",
                      },
                    ]}
                  >
                    {place.type === "Trail" ? (
                      <Ionicons
                        name="footsteps-outline"
                        size={12}
                        color="#333"
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="pine-tree"
                        size={14}
                        color="#333"
                      />
                    )}

                    <Text style={styles.typeBadgeText}>{place.type}</Text>
                  </View>

                  {/* Favourite Button */}
                  <Pressable
                    style={styles.heartButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      toggleFavourite(place);
                    }}
                    disabled={updatingId !== null}
                    accessibilityLabel={
                      savedIds.includes(place.id)
                        ? "Remove from saved places"
                        : "Save place"
                    }
                  >
                    <Ionicons
                      name={
                        savedIds.includes(place.id) ? "heart" : "heart-outline"
                      }
                      size={21}
                      color={savedIds.includes(place.id) ? "#F46C6C" : "#333"}
                    />
                  </Pressable>
                </View>

                {/* Horizontal container for name and arrow */}
                <View style={styles.placeNameRow}>
                  <Text style={styles.placeName}>{place.name}</Text>

                  {/* Open selected place details */}
                  <Pressable
                    style={styles.viewDetailsButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      navigation.navigate("DetailPlace", { place });
                    }}
                    hitSlop={8} // Touch Area
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${place.name}`}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#333" />
                  </Pressable>
                </View>

                {/*Category and distance information */}
                <View style={styles.placeDetails}>
                  <PlaceInfo place={place} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
  },

  topSection: {
    paddingTop: 65,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#FEFCFA",
    zIndex: 2,
  },

  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  searchBar: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: "#B5BA74",
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#333",
  },

  savedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D4D88E",
    borderRadius: 9,
    paddingHorizontal: 12,
    gap: 6,
  },

  savedText: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#333",
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
  },

  filterButton: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  activeFilterButton: {
    backgroundColor: "#D4D88E",
    borderColor: "#8F9E42",
  },

  disabledFilter: {
    opacity: 0.45,
  },

  filterText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#333",
  },

  map: {
    flex: 1,
    width: "100%",
  },

  locationButton: {
    position: "absolute",
    right: 15,
    top: 210,
    width: 45,
    height: 45,
    backgroundColor: "#FEFCFA",
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    zIndex: 2,
  },

  refreshButton: {
    position: "absolute",
    right: 15,
    top: 265,
    width: 45,
    height: 45,
    backgroundColor: "#FEFCFA",
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    zIndex: 2,
  },

  //Disabled map control appearance
  disabledButton: {
    opacity: 0.6,
  },

  suggestionsSection: {
    backgroundColor: "#FEFCFA",
    paddingTop: 18,
    paddingBottom: 20,
  },

  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },

  sectionTitle: {
    fontFamily: "PawPath-Medium",
    fontSize: 15,
    color: "#333",
  },

  viewAllText: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#8F9E42",
  },

  cardList: {
    paddingRight: 18,
  },

  placeCard: {
    width: 210,
    marginLeft: 18,
    backgroundColor: "#CFE5FD",
    borderRadius: 8,
    overflow: "hidden",
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: "#8F9E42",
  },

  // Container for shared photo,
  // category badge and favourite button
  imageContainer: {
    height: 115,
    position: "relative",
  },

  //Controls PlacePhoto dimensions
  placePhoto: {
    width: "100%",
    height: "100%",
  },
  // Park / Trail category badge
  typeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },

  //Category badge text
  typeBadgeText: {
    fontFamily: "PawPath-Medium",
    fontSize: 10,
    color: "#333",
  },
  placeDetails: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#D4D88E",
    borderRadius: 8,
    padding: 7,

    // Keep button dimensions consistent
    minWidth: 35,
    minHeight: 35,
    justifyContent: "center",
    alignItems: "center",
  },

  // Separate pressable area for map selection
  placeInformation: {
    flexGrow: 1,
  },

  placeName: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#333",
    flex: 1,
    // paddingHorizontal: 12,
    // paddingTop: 12,
  },
  placeNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  placeDistance: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#555",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },

  statusContainer: {
    minHeight: 110,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
  },

  statusText: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#555",
    textAlign: "center",
  },

  retryText: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#8F9E42",
  },

  // Custom park and trail map marker
  customMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",

    // Android shadow
    elevation: 4,

    // iOS shadow
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  // View Details button
  viewDetailsButton: {
    backgroundColor: "#D4D88E",
    borderRadius: 6,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
