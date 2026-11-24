// import { signOut } from "firebase/auth";
import { useCallback, useEffect, useState, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { httpsCallable } from "firebase/functions";

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  Image,
  View,
  Pressable,
  ScrollView,
} from "react-native";

import { firebase_auth, firebase_functions } from "../../firebaseConfig";
// Shared components
import PlacePhoto from "../../components/PlacePhoto";
import PlaceInfo from "../../components/PlaceInfo";

// Favourite and distance functions
import {
  getFavourites,
  saveFavourite,
  removeFavourite,
  calculateDistance,
} from "../../utils/favouriteStorage";

export default function HomeScreen({ navigation }) {
  const user = firebase_auth.currentUser;
  // const suggestedPlaces = samplePlaces.slice(0, 4);

  // --------------------------------------------------
  // Weather states
  const [weather, setWeather] = useState(null); //weather
  const [loading, setLoading] = useState(true); // loading state
  const [error, setError] = useState(null);

  // --------------------------------------------------
  // Nearby places states
  const [places, setPlaces] = useState([]);
  const [searchCenter, setSearchCenter] = useState(null);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [placesError, setPlacesError] = useState("");

  // --------------------------------------------------
  // Favourite states [NEW]
  const [savedIds, setSavedIds] = useState([]);
  const [loadingFavourites, setLoadingFavourites] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Track favourite loading errors
  const [favouriteError, setFavouriteError] = useState(false);

  // Prevent overlapping requests
  const loadingPlacesRef = useRef(false);
  const updatingFavouriteRef = useRef(false);

  // set conditions for weather icon according to weather data
  const getWeatherIcon = (condition) => {
    if (!condition) return "cloud-outline";

    const weather = condition.toLowerCase();

    if (weather.includes("sun")) {
      return "sunny";
    }

    if (weather.includes("cloud")) {
      return "cloud";
    }

    if (weather.includes("rain")) {
      return "rainy";
    }

    if (weather.includes("snow")) {
      return "snow";
    }

    if (weather.includes("thunder")) {
      return "thunderstorm";
    }

    return "partly-sunny";
  };

  // fetch weather data using coordinates
  async function fetchWeather() {
    const username = process.env.EXPO_PUBLIC_USERNAME;

    try {
      const response = await fetch(
        `http://api.geonames.org/findNearByWeatherJSON?lat=49.19&lng=-123.17&username=${username}`,
      );
      const data = await response.json();

      if (response.ok && data.weatherObservation) {
        setWeather(data.weatherObservation);
      } else {
        // Handle cases where API returns an error message in the body
        setError(data.status?.message || "Failed to fetch weather");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchWeather();
  }, []);

  // rendering logic
  // if (loading) {
  //   return (
  //     <View style={styles.container}>
  //       <ActivityIndicator size="large" color="#0000ff" />
  //     </View>
  //   );
  // }

  // if (error) {
  //   return (
  //     <View style={styles.container}>
  //       <Text style={styles.errorText}>Error: {error}</Text>
  //     </View>
  //   );
  // }

  // --------------------------------------------------
  //  Retrieve nearby parks and trails
  const fetchNearbyPlaces = useCallback(async () => {
    if (loadingPlacesRef.current) return;

    try {
      loadingPlacesRef.current = true;

      setLoadingPlaces(true);
      setPlacesError("");

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setPlacesError("Enable location permission to discover nearby places.");
        return;
      }

      // Retrieve the user's current GPS location
      const location = await Location.getCurrentPositionAsync({});

      const { latitude, longitude } = location.coords;

      // Store coordinates for distance and navigation
      setSearchCenter({
        latitude,
        longitude,
      });

      // Reference the existing Firebase Cloud Function
      const getNearbyParks = httpsCallable(
        firebase_functions,
        "getNearbyParks",
      );

      // Retrieve actual nearby parks and trails
      const result = await getNearbyParks({
        latitude,
        longitude,
      });

      const returnedPlaces = result.data?.places ?? [];

      // Validate and format the returned place objects
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

          photoName: place.photoName ?? null,

          photoAttributions: place.photoAttributions ?? [],

          photoGoogleMapsUri: place.photoGoogleMapsUri ?? null,

          attributions: place.attributions ?? [],

          // Calculate distance from user's current location
          distanceKm: calculateDistance(
            latitude,
            longitude,
            place.latitude,
            place.longitude,
          ),
        }))
        // Display the closest places first
        .sort((a, b) => a.distanceKm - b.distanceKm);

      setPlaces(validPlaces);

      console.log("Home nearby places retrieved:", validPlaces.length);
    } catch (error) {
      console.log("Home nearby places error:", error.code, error.message);

      setPlacesError("Unable to load nearby parks and trails.");
    } finally {
      loadingPlacesRef.current = false;
      setLoadingPlaces(false);
    }
  }, []);

  // --------------------------------------------------
  //Retrieve nearby places when HomeScreen mounts
  useEffect(() => {
    fetchNearbyPlaces();
  }, [fetchNearbyPlaces]);

  // --------------------------------------------------
  // Load favourite status whenever HomeScreen is focused
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadSavedPlaces() {
        try {
          setLoadingFavourites(true);

          const favourites = await getFavourites();

          if (active) {
            setSavedIds(favourites.map((place) => place.id));

            setLoadingFavourites(false);
          }
        } catch (error) {
          console.log("Home favourite loading error:", error);
        }
      }

      loadSavedPlaces();

      return () => {
        active = false;
      };
    }, []),
  );

  // --------------------------------------------------
  // Save or remove a favourite place
  async function toggleFavourite(place) {
    if (updatingFavouriteRef.current || loadingFavourites) {
      return;
    }

    try {
      updatingFavouriteRef.current = true;
      setUpdatingId(place.id);

      if (savedIds.includes(place.id)) {
        await removeFavourite(place.id);

        setSavedIds((previous) => previous.filter((id) => id !== place.id));
      } else {
        await saveFavourite(place);

        setSavedIds((previous) => [...previous, place.id]);
      }
    } catch (error) {
      console.log("Favourite update error:", error);

      Alert.alert("Error", "Unable to update saved places.");
    } finally {
      updatingFavouriteRef.current = false;
      setUpdatingId(null);
    }
  }

  // --------------------------------------------------
  //  Display only the four closest places
  const suggestedPlaces = places.slice(0, 4);

  // --------------------------------------------------
  // Open the selected place's detail screen
  function openPlaceDetails(place) {
    navigation.navigate("Map", {
      screen: "DetailPlace",
      initial: false,
      params: {
        place,
      },
    });
  }

  // --------------------------------------------------
  // Browse all retrieved nearby places
  function viewAllPlaces() {
    navigation.navigate("Map", {
      screen: "ChooseLocation",
      initial: false,
      params: {
        places,
        searchCenter,
      },
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.logoTitle}>Pawpath</Text>
      <Text style={styles.title}>Hi, {user?.displayName || "User"} </Text>

      {/* display weather information */}
      <View style={styles.headerInfoContainer}>
        <View style={styles.weatherCard}>
          {loading ? (
            // Display while weather data is loading
            <View style={styles.weatherStatus}>
              <ActivityIndicator size="small" color="#8F9E42" />

              <Text style={styles.descText}>Loading weather...</Text>
            </View>
          ) : error ? (
            // Display if weather API fails
            <View style={styles.weatherStatus}>
              <Ionicons name="cloud-offline-outline" size={28} color="#999" />

              <Text style={styles.descText}>
                Weather information unavailable.
              </Text>
            </View>
          ) : weather ? (
            // Display actual weather information
            <>
              <Ionicons
                name={getWeatherIcon(weather.clouds)}
                size={30}
                color="#CFE5FD"
              />

              <View style={styles.weatherInfo}>
                <Text style={styles.tempText}>{weather.temperature}°C</Text>

                <Text style={styles.descText}>
                  Humidity: {weather.humidity}%
                </Text>

                <Text style={styles.descText}>
                  Wind Speed: {weather.windSpeed} m/s
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* plan for today */}
        <Pressable
          style={styles.activityPlan}
          onPress={() =>
            navigation.navigate("Calendar", {
              screen: "PlanWalk",
              initial: false,
              params: { from: "Home" },
            })
          }
        >
          <Text style={styles.activityText}>Today's Plan</Text>
          <Text style={styles.activityText}>+ Add Activity</Text>
        </Pressable>
      </View>

      {/* walk button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.beginButton}
          onPress={() => navigation.navigate("SelectPet")}
        >
          <Image
            source={require("../../../assets/img/dog_icon.png")}
            style={styles.logoImg}
            resizeMode="contain"
            accessibilityLabel="Walk Logo"
          />

          <Text style={styles.buttonText}>Begin Walk</Text>
        </Pressable>
      </View>
      {/* [UPDATED] Actual nearby place suggestions */}
      <View style={styles.suggestionsSection}>
        {/* Section header */}
        <View style={styles.suggestionsHeader}>
          <Text style={styles.subtitle}>Place you might like</Text>

          <Pressable
            onPress={viewAllPlaces}
            disabled={loadingPlaces || places.length === 0}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.viewAllText,
                (loadingPlaces || places.length === 0) && styles.disabledButton,
              ]}
            >
              View All
            </Text>
          </Pressable>
        </View>

        {/* Loading nearby places */}
        {loadingPlaces ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#8F9E42" />

            <Text style={styles.statusText}>
              Finding nearby parks and trails...
            </Text>
          </View>
        ) : placesError ? (
          // API or location permission error
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{placesError}</Text>

            <Pressable onPress={fetchNearbyPlaces}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : suggestedPlaces.length === 0 ? (
          // No nearby results
          <View style={styles.statusContainer}>
            <Ionicons name="location-outline" size={30} color="#B5BA74" />

            <Text style={styles.statusText}>
              No nearby parks or trails found.
            </Text>
          </View>
        ) : (
          // Display actual nearby places
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardList}
            >
              {suggestedPlaces.map((place) => {
                const isSaved = savedIds.includes(place.id);
                const isTrail = place.type === "Trail";

                return (
                  <View key={place.id} style={styles.placeCard}>
                    {/* Place photo */}
                    <View style={styles.imageContainer}>
                      <PlacePhoto place={place} style={styles.placeImage} />

                      {/* Park or Trail badge */}
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: isTrail ? "#F5DEC0" : "#D4D88E",
                          },
                        ]}
                      >
                        {isTrail ? (
                          <Ionicons
                            name="footsteps-outline"
                            size={13}
                            color="#333"
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name="pine-tree"
                            size={15}
                            color="#333"
                          />
                        )}

                        <Text style={styles.typeBadgeText}>{place.type}</Text>
                      </View>

                      {/* Favourite button */}
                      <Pressable
                        style={styles.heartButton}
                        onPress={() => toggleFavourite(place)}
                        disabled={updatingId !== null || loadingFavourites}
                        accessibilityLabel={
                          isSaved ? "Remove from saved places" : "Save place"
                        }
                      >
                        <Ionicons
                          name={isSaved ? "heart" : "heart-outline"}
                          size={21}
                          color={isSaved ? "#F46C6C" : "#333"}
                        />
                      </Pressable>
                    </View>

                    {/* Place name and View Details arrow */}
                    <View style={styles.placeNameRow}>
                      <Text style={styles.placeName} numberOfLines={2}>
                        {place.name}
                      </Text>

                      <Pressable
                        style={styles.detailButton}
                        onPress={() => openPlaceDetails(place)}
                        accessibilityLabel={`View details for ${place.name}`}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#333"
                        />
                      </Pressable>
                    </View>

                    {/* Place category and distance */}
                    <View style={styles.placeInfo}>
                      <PlaceInfo
                        place={place}
                        distanceLabel="from current location"
                      />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    padding: 20,
  },

  scrollContent: {
    paddingBottom: 35,
  },

  logoTitle: {
    fontSize: 16,
    fontFamily: "PawPath-Bold",
    color: "#000",
    marginTop: 35,
    marginBottom: 5,
  },

  title: {
    fontSize: 25,
    fontFamily: "PawPath-Regular",
    marginTop: 15,
    marginBottom: 20,
    marginLeft: 10,
  },

  headerInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 10,
    marginBottom: 20,
  },

  // --------------------------------------------------
  // Today's Plan styling

  activityText: {
    fontSize: 14,
    fontFamily: "PawPath-Regular",
  },

  activityPlan: {
    padding: 20,
    width: "50%",
    height: 100,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#D4D88E",
    borderRadius: 12,
  },

  // --------------------------------------------------
  // Begin Walk button styling

  buttonContainer: {
    width: "100%",
  },

  beginButton: {
    backgroundColor: "#D4D88E",
    padding: 40,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    fontSize: 16,
    fontFamily: "PawPath-Regular",
    textAlign: "center",
  },

  logoImg: {
    width: 100,
    height: 100,
  },

  // --------------------------------------------------
  // Weather styling

  weatherCard: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#FEFCFA",
    marginLeft: 10,
  },

  weatherInfo: {
    flex: 1,
  },

  // Weather loading and error styling
  weatherStatus: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 8,
    paddingBottom: 15,
  },

  cityText: {
    fontSize: 14,
    fontFamily: "PawPath-Medium",
  },

  tempText: {
    fontSize: 28,
    fontFamily: "PawPath-Medium",
  },

  descText: {
    fontSize: 12,
    fontFamily: "PawPath-Regular",
    color: "#666",
  },

  // --------------------------------------------------
  // Nearby place suggestion styling

  suggestionsSection: {
    backgroundColor: "#FEFCFA",
    paddingTop: 30,
    paddingBottom: 20,
  },

  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  subtitle: {
    fontSize: 16,
    fontFamily: "PawPath-Medium",
    color: "#333",
  },

  viewAllText: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#8F9E42",
  },

  cardList: {
    gap: 18,
    paddingRight: 4,
  },

  placeCard: {
    width: 210,
    backgroundColor: "#CFE5FD",
    borderRadius: 8,
    overflow: "hidden",
  },

  imageContainer: {
    height: 115,
    position: "relative",
  },

  placeImage: {
    width: "100%",
    height: "100%",
  },

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

  typeBadgeText: {
    fontFamily: "PawPath-Medium",
    fontSize: 10,
    color: "#333",
  },

  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#D4D88E",
    borderRadius: 8,
    padding: 7,
    minWidth: 35,
    minHeight: 35,
    justifyContent: "center",
    alignItems: "center",
  },

  placeNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },

  placeName: {
    flex: 1,
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#333",
  },

  detailButton: {
    backgroundColor: "#D4D88E",
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  placeInfo: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
  },

  // --------------------------------------------------
  // Nearby places loading and error styling

  statusContainer: {
    minHeight: 110,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
  },

  statusText: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#777",
    textAlign: "center",
  },

  retryText: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#8F9E42",
  },

  disabledButton: {
    opacity: 0.5,
  },

  sourceText: {
    fontFamily: "PawPath-Regular",
    fontSize: 10,
    color: "#777",
    textAlign: "right",
    marginTop: 8,
  },
});
