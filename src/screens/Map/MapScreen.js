import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Geocoder from "react-native-geocoding";
import MapView from "react-native-maps";

import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { samplePlaces } from "../../data/samplePlaces";

import {
  getFavourites,
  saveFavourite,
  removeFavourite,
} from "../../utils/favouriteStorage";

export default function MapScreen({ navigation }) {
  // Google Maps API Key from .env
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;

  // --------------------------------------------------
  // State management from Google Maps lecture demo
  // --------------------------------------------------

  // Stores user's current GPS location
  const [currentLocation, setCurrentLocation] = useState(null);

  // Stores the text entered in the search bar
  const [searchLocation, setSearchLocation] = useState("");

  // Tracks whether location permission was granted
  const [locationGranted, setLocationGranted] = useState(false);

  // Reference to MapView for camera animation
  const mapRef = useRef(null);

  // --------------------------------------------------
  // Additional PawPath states
  // --------------------------------------------------

  // Stores the IDs of places saved in Firestore
  const [savedIds, setSavedIds] = useState([]);

  // Prevents repeated favourite updates
  const [updatingId, setUpdatingId] = useState(null);

  // --------------------------------------------------
  // Initialize Google Geocoder
  // Same implementation as lecture demo
  // --------------------------------------------------

  useEffect(() => {
    if (apiKey) {
      Geocoder.init(apiKey);
    } else {
      console.warn("Google Maps API key is missing");
    }
  }, [apiKey]);

  // --------------------------------------------------
  // Search for a location using Google Geocoding
  // Adapted from performSearch() in lecture demo
  // --------------------------------------------------

  async function performSearch() {
    if (!searchLocation.trim()) {
      Alert.alert("Search", "Please enter a location.");
      return;
    }

    if (!apiKey) {
      Alert.alert("Error", "Google Maps API key is missing.");
      return;
    }

    try {
      Keyboard.dismiss();

      // Convert location name/address to coordinates
      const json = await Geocoder.from(searchLocation.trim());

      if (!json.results || json.results.length === 0) {
        Alert.alert("Not Found", "Location not found.");
        return;
      }

      const location = json.results[0].geometry.location;

      const searchedLocation = {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

      // Move map camera to searched location
      mapRef.current?.animateCamera(
        {
          center: searchedLocation,
          zoom: 15,
        },
        { duration: 2000 },
      );
    } catch (error) {
      console.warn("Geocoding Error:", error);

      Alert.alert("Search Error", "Unable to find this location.");
    }
  }

  // --------------------------------------------------
  // Request GPS permission and retrieve current location
  // Adapted from lecture demo
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function getCurrentLocation() {
      try {
        // Request foreground location permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!active) return;

        if (status !== "granted") {
          console.log("Location permission denied");
          return;
        }

        setLocationGranted(true);

        // Retrieve GPS coordinates
        const location = await Location.getCurrentPositionAsync({});

        if (!active) return;

        if (location) {
          setCurrentLocation(location);

          console.log(
            `Current location: lat: ${location.coords.latitude}, lng: ${location.coords.longitude}`,
          );

          // Move map to current GPS position
          mapRef.current?.animateCamera(
            {
              center: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              },
              zoom: 15,
            },
            { duration: 2000 },
          );
        }
      } catch (error) {
        console.warn("Location Error:", error);
      }
    }

    getCurrentLocation();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // Move map to user's current GPS location
  // Same approach as lecture demo
  // --------------------------------------------------

  function goToCurrentLocation() {
    if (currentLocation) {
      mapRef.current?.animateCamera(
        {
          center: {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          },
          zoom: 15,
        },
        { duration: 2000 },
      );
    } else {
      Alert.alert(
        "Location Unavailable",
        "Current location is not available yet.",
      );
    }
  }

  // --------------------------------------------------
  // PawPath: Load saved places from Firestore
  // --------------------------------------------------

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
  // PawPath: Save or remove a favourite place
  // --------------------------------------------------

  async function toggleFavourite(place) {
    if (updatingId) return;

    try {
      setUpdatingId(place.id);

      if (savedIds.includes(place.id)) {
        // DELETE from Firestore
        await removeFavourite(place.id);

        setSavedIds((previous) => previous.filter((id) => id !== place.id));
      } else {
        // CREATE in Firestore
        await saveFavourite(place);

        setSavedIds((previous) => [...previous, place.id]);
      }
    } catch (error) {
      console.log("Favourite error:", error);

      Alert.alert("Error", "Unable to update saved places.");
    } finally {
      setUpdatingId(null);
    }
  }

  // Temporary sample suggestions for Milestone 2
  const suggestedPlaces = samplePlaces.slice(0, 4);

  return (
    <View style={styles.container}>
      {/* -------------------------------------------
          PawPath search bar and Saved Places
      ------------------------------------------- */}

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

            <Pressable onPress={performSearch}>
              <Ionicons name="arrow-forward-circle" size={23} color="#8F9E42" />
            </Pressable>
          </View>

          {/* Navigate to SavedFavouriteScreen */}
          <Pressable
            style={styles.savedButton}
            onPress={() => navigation.navigate("SavedFavourite")}
          >
            <Ionicons name="heart-outline" size={17} color="#333" />

            <Text style={styles.savedText}>Saved</Text>
          </Pressable>
        </View>

        {/* Filter UI: Future implementation */}
        <View style={styles.filterRow}>
          <View style={styles.filterButton}>
            <Text style={styles.filterText}>All</Text>
          </View>

          <View style={styles.filterButton}>
            <Text style={styles.filterText}>Parks</Text>
          </View>

          <View style={styles.filterButton}>
            <Text style={styles.filterText}>Trails</Text>
          </View>

          <View style={styles.filterButton}>
            <Text style={styles.filterText}>Difficulty⌄</Text>
          </View>
        </View>
      </View>

      {/* -------------------------------------------
          MapView from Google Maps lecture demo
      ------------------------------------------- */}

      <MapView
        style={styles.map}
        ref={mapRef}
        initialRegion={{
          // Default location: YVR
          latitude: 49.19418,
          longitude: -123.17505,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        mapType="satellite"
      />

      {/* Custom Current Location Button */}
      <Pressable style={styles.locationButton} onPress={goToCurrentLocation}>
        <Ionicons name="locate-outline" size={24} color="#333" />
      </Pressable>

      {/* -------------------------------------------
          Suggested Places - Sample data for M2
      ------------------------------------------- */}

      <View style={styles.suggestionsSection}>
        <View style={styles.suggestionsHeader}>
          <Text style={styles.sectionTitle}>Place you might like</Text>

          <Pressable onPress={() => navigation.navigate("ChooseLocation")}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardList}
        >
          {suggestedPlaces.map((place) => (
            <View key={place.id} style={styles.placeCard}>
              {/* Place image or placeholder */}
              <View style={styles.imageContainer}>
                {place.image ? (
                  <Image
                    source={place.image}
                    style={styles.placeImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="leaf-outline" size={35} color="#8F9E42" />
                  </View>
                )}

                {/* Save favourite button */}
                <Pressable
                  style={styles.heartButton}
                  onPress={() => toggleFavourite(place)}
                  disabled={updatingId !== null}
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

              <Text style={styles.placeName}>{place.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
  },

  // Search and filter section
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

  filterText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#333",
  },

  // Interactive map
  map: {
    flex: 1,
    width: "100%",
  },

  // Custom GPS button
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

  // Suggested places section
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

  imageContainer: {
    height: 115,
  },

  placeImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    backgroundColor: "#E8EEDB",
    justifyContent: "center",
    alignItems: "center",
  },

  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#D4D88E",
    borderRadius: 8,
    padding: 7,
  },

  placeName: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#333",
    padding: 12,
  },
});
