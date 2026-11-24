import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { httpsCallable } from "firebase/functions";

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { firebase_functions } from "../firebaseConfig";

import PlacePhoto from "./PlacePhoto";
import PlaceInfo from "./PlaceInfo";

import {
  getFavourites,
  getFavouritesWithDetails,
  calculateDistance,
} from "../utils/favouriteStorage";

export default function LocationPicker({ visible, onClose, onSelectLocation }) {
  // --------------------------------------------------
  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // --------------------------------------------------
  // Nearby places states
  const [places, setPlaces] = useState([]);
  const [searchCenter, setSearchCenter] = useState(null);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [placesError, setPlacesError] = useState("");

  // --------------------------------------------------
  // Favourite places states
  const [savedIds, setSavedIds] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savedError, setSavedError] = useState("");

  // Retry states
  const [nearbyRetry, setNearbyRetry] = useState(0);
  const [savedRetry, setSavedRetry] = useState(0);

  // --------------------------------------------------
  // Only load photos for visible list items
  const [visibleIds, setVisibleIds] = useState([]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 30,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    setVisibleIds(viewableItems.map((entry) => entry.item.id));
  }).current;

  // --------------------------------------------------
  // Reset search and filter when modal opens
  useEffect(() => {
    if (visible) {
      setSearchText("");
      setActiveFilter("All");
      setVisibleIds([]);
    }
  }, [visible]);

  // --------------------------------------------------
  // Retrieve nearby parks and trails
  // This replaces the need for nearbyPlaces.js
  useEffect(() => {
    if (!visible) return;

    let active = true;

    async function fetchNearbyPlaces() {
      try {
        setLoadingPlaces(true);
        setPlacesError("");
        setPlaces([]);
        setSearchCenter(null);

        // Request GPS permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!active) return;

        if (status !== "granted") {
          setPlacesError(
            "Enable location permission to discover nearby places.",
          );
          return;
        }

        // Retrieve current GPS coordinates
        const location = await Location.getCurrentPositionAsync({});

        if (!active) return;

        const { latitude, longitude } = location.coords;

        const currentLocation = {
          latitude,
          longitude,
        };

        setSearchCenter(currentLocation);

        // Call existing Firebase Cloud Function
        const getNearbyParks = httpsCallable(
          firebase_functions,
          "getNearbyParks",
        );

        const result = await getNearbyParks({
          latitude,
          longitude,
        });

        if (!active) return;

        const returnedPlaces = result.data?.places ?? [];

        // Validate and format nearby places
        const validPlaces = returnedPlaces
          .filter(
            (place) =>
              place.id &&
              Number.isFinite(place.latitude) &&
              Number.isFinite(place.longitude),
          )
          .map((place) => ({
            ...place,

            name: place.name || "Unnamed Place",

            type: place.type === "Trail" ? "Trail" : "Park",

            source: "google",

            distanceKm: calculateDistance(
              latitude,
              longitude,
              place.latitude,
              place.longitude,
            ),
          }))
          // Display closest places first
          .sort((a, b) => a.distanceKm - b.distanceKm);

        setPlaces(validPlaces);

        console.log("Location picker nearby places:", validPlaces.length);
      } catch (error) {
        console.log("Nearby places error:", error);

        if (active) {
          setPlacesError("Unable to retrieve nearby parks and trails.");
        }
      } finally {
        if (active) {
          setLoadingPlaces(false);
        }
      }
    }

    fetchNearbyPlaces();

    return () => {
      active = false;
    };
  }, [visible, nearbyRetry]);

  // --------------------------------------------------
  // Retrieve favourite IDs from Firestore
  useEffect(() => {
    if (!visible) return;

    let active = true;

    async function loadFavouriteIds() {
      try {
        const favourites = await getFavourites();

        if (active) {
          setSavedIds(favourites.map((place) => place.id));
        }
      } catch (error) {
        console.log("Favourite IDs error:", error);
      }
    }

    loadFavouriteIds();

    return () => {
      active = false;
    };
  }, [visible]);

  // --------------------------------------------------
  // Retrieve saved place details
  // Only retrieve when the Saved filter is selected
  useEffect(() => {
    if (!visible || activeFilter !== "Saved" || loadingPlaces) {
      return;
    }

    let active = true;

    async function loadSavedPlaces() {
      try {
        setLoadingSaved(true);
        setSavedError("");

        // Reuse nearby results where possible
        const favourites = await getFavouritesWithDetails(places, searchCenter);

        if (active) {
          setSavedPlaces(favourites);

          setSavedIds(favourites.map((place) => place.id));
        }
      } catch (error) {
        console.log("Saved places error:", error);

        if (active) {
          setSavedError("Unable to retrieve saved places.");
        }
      } finally {
        if (active) {
          setLoadingSaved(false);
        }
      }
    }

    loadSavedPlaces();

    return () => {
      active = false;
    };
  }, [visible, activeFilter, places, searchCenter, loadingPlaces, savedRetry]);

  // --------------------------------------------------
  // Select an existing place
  function selectPlace(place) {
    if (place.detailsUnavailable || !place.name) {
      return;
    }

    // Update location state in the parent screen
    onSelectLocation(place.name);

    // Close the modal
    onClose();
  }

  // --------------------------------------------------
  // Enter a location manually
  function selectManualLocation() {
    const manualLocation = searchText.trim();

    if (!manualLocation) return;

    onSelectLocation(manualLocation);

    onClose();
  }

  // --------------------------------------------------
  // Handle category selection
  function handleFilterChange(filter) {
    if (filter === activeFilter) return;

    setVisibleIds([]);

    if (filter === "Saved") {
      setLoadingSaved(true);
      setSavedError("");
    }

    setActiveFilter(filter);
  }

  // --------------------------------------------------
  // Determine which dataset to display
  const availablePlaces = activeFilter === "Saved" ? savedPlaces : places;

  // Search and category filtering
  const filteredPlaces = availablePlaces.filter((place) => {
    const matchesSearch = (place.name || "")
      .toLowerCase()
      .includes(searchText.trim().toLowerCase());

    const matchesType =
      activeFilter === "All" ||
      activeFilter === "Saved" ||
      (activeFilter === "Parks" && place.type === "Park") ||
      (activeFilter === "Trails" && place.type === "Trail");

    return matchesSearch && matchesType;
  });

  // Determine loading and error states
  const isLoading =
    activeFilter === "Saved" ? loadingPlaces || loadingSaved : loadingPlaces;

  const currentError = activeFilter === "Saved" ? savedError : placesError;

  // --------------------------------------------------
  // Empty result message
  function getEmptyMessage() {
    if (searchText.trim()) {
      return "No matching places found. You can enter your location manually.";
    }

    if (activeFilter === "Saved") {
      return "You haven't saved any places yet.";
    }

    if (activeFilter === "Parks") {
      return "No nearby parks found.";
    }

    if (activeFilter === "Trails") {
      return "No nearby trails found.";
    }

    return "No nearby places found.";
  }

  // --------------------------------------------------
  // Render each place in FlatList
  function renderPlace({ item: place }) {
    const isSaved = savedIds.includes(place.id);

    return (
      <View
        style={[
          styles.placeRow,
          place.detailsUnavailable && styles.disabledRow,
        ]}
      >
        {/* Place photo */}
        <PlacePhoto
          place={place}
          style={styles.placeImage}
          enabled={visible && visibleIds.includes(place.id)}
        />

        {/* Select location */}
        <Pressable
          style={styles.placeSelection}
          onPress={() => selectPlace(place)}
          disabled={place.detailsUnavailable}
          accessibilityRole="button"
          accessibilityLabel={`Select ${place.name}`}
        >
          <View style={styles.placeInfo}>
            <Text style={styles.placeName}>
              {place.name || "Unnamed Place"}
            </Text>

            <PlaceInfo place={place} distanceLabel="from current location" />
          </View>

          {/* Indicate previously saved locations */}
          {isSaved && <Ionicons name="heart" size={18} color="#F46C6C" />}

          <Ionicons name="chevron-forward" size={18} color="#333" />
        </Pressable>
      </View>
    );
  }

  // --------------------------------------------------
  // Modal UI
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close location picker"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={25} color="#333" />
            </Pressable>

            <Text style={styles.title}>Choose Location</Text>
          </View>

          {/* Search / manual location input */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#777" />

            <TextInput
              style={styles.searchInput}
              placeholder="Search or enter a location"
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="done"
              autoCorrect={false}
            />

            {searchText.length > 0 && (
              <Pressable
                onPress={() => setSearchText("")}
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </Pressable>
            )}
          </View>

          {/* Manual location option */}
          {searchText.trim().length > 0 && (
            <Pressable
              style={styles.manualLocation}
              onPress={selectManualLocation}
              accessibilityRole="button"
            >
              <Ionicons name="location-outline" size={23} color="#8F9E42" />

              <View style={styles.manualInfo}>
                <Text style={styles.manualTitle}>
                  Use "{searchText.trim()}"
                </Text>

                <Text style={styles.manualSubtitle}>
                  Enter location manually
                </Text>
              </View>

              <Ionicons name="checkmark" size={22} color="#8F9E42" />
            </Pressable>
          )}

          {/* Category filters */}
          <View style={styles.filterRow}>
            {["All", "Parks", "Trails", "Saved"].map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && styles.activeFilter,
                ]}
                onPress={() => handleFilterChange(filter)}
              >
                <Text style={styles.filterText}>
                  {filter === "Saved" ? "Saved Places" : filter}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* List heading */}
          <Text style={styles.sectionTitle}>
            {activeFilter === "Saved"
              ? "Your saved places"
              : "Near your current location"}
          </Text>

          <Text style={styles.sourceText}>Google Maps</Text>

          {/* Loading, error and result states */}
          {isLoading ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="large" color="#8F9E42" />

              <Text style={styles.statusText}>
                {activeFilter === "Saved"
                  ? "Loading saved places..."
                  : "Finding nearby places..."}
              </Text>
            </View>
          ) : currentError ? (
            <View style={styles.statusContainer}>
              <Ionicons name="location-outline" size={32} color="#B5BA74" />

              <Text style={styles.statusText}>{currentError}</Text>

              <Pressable
                onPress={() => {
                  if (activeFilter === "Saved") {
                    setSavedRetry((previous) => previous + 1);
                  } else {
                    setNearbyRetry((previous) => previous + 1);
                  }
                }}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>

              <Text style={styles.statusText}>
                You can still enter a location manually.
              </Text>
            </View>
          ) : (
            <FlatList
              key={activeFilter}
              data={filteredPlaces}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderPlace}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              viewabilityConfig={viewabilityConfig}
              onViewableItemsChanged={onViewableItemsChanged}
              extraData={visibleIds}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={3}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
  },

  keyboardContainer: {
    flex: 1,
    paddingHorizontal: 25,
  },

  // Header
  header: {
    minHeight: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  closeButton: {
    position: "absolute",
    left: 0,
    width: 42,
    height: 42,
    borderRadius: 25,
    backgroundColor: "#D4D88E",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },

  title: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 18,
    color: "#222",
  },

  // Search bar
  searchBar: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: "#B5BA74",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 15,
  },

  searchInput: {
    flex: 1,
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#222",
    paddingVertical: 12,
  },

  // Manual location option
  manualLocation: {
    backgroundColor: "#E9EBCB",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    marginBottom: 15,
  },

  manualInfo: {
    flex: 1,
    gap: 4,
  },

  manualTitle: {
    fontFamily: "PawPath-Medium",
    fontSize: 13,
    color: "#333",
  },

  manualSubtitle: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#666",
  },

  // Category filters
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 20,
  },

  filterButton: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  activeFilter: {
    backgroundColor: "#D4D88E",
    borderColor: "#8F9E42",
  },

  filterText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#333",
  },

  sectionTitle: {
    fontFamily: "PawPath-Medium",
    fontSize: 13,
    color: "#555",
    marginBottom: 5,
  },

  sourceText: {
    fontFamily: "PawPath-Regular",
    fontSize: 10,
    color: "#777",
    textAlign: "right",
    marginBottom: 5,
  },

  // Place list
  list: {
    paddingBottom: 30,
  },

  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
    gap: 12,
  },

  placeImage: {
    width: 70,
    height: 65,
    borderRadius: 8,
  },

  placeSelection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 65,
  },

  placeInfo: {
    flex: 1,
    gap: 6,
  },

  placeName: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 13,
    color: "#222",
  },

  disabledRow: {
    opacity: 0.5,
  },

  // Loading and error states
  statusContainer: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  statusText: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    lineHeight: 19,
  },

  retryText: {
    fontFamily: "PawPath-Medium",
    fontSize: 13,
    color: "#8F9E42",
  },

  emptyText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 30,
    lineHeight: 21,
  },
});
