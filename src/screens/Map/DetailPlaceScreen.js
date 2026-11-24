import { useCallback, useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { httpsCallable } from "firebase/functions";
import { firebase_functions } from "../../firebaseConfig";

import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PlacePhoto from "../../components/PlacePhoto";
import PlaceInfo from "../../components/PlaceInfo";

import {
  getFavourites,
  saveFavourite,
  removeFavourite,
} from "../../utils/favouriteStorage";

export default function DetailPlaceScreen({ navigation, route }) {
  // Retrieve the selected place from navigation parameters
  const place = route.params?.place;

  // --------------------------------------------------
  // Favourite states
  const [isSaved, setIsSaved] = useState(false);
  const [loadingFavourite, setLoadingFavourite] = useState(true);
  const [updatingFavourite, setUpdatingFavourite] = useState(false);

  // --------------------------------------------------
  // API information loading states
  const [placeDetails, setPlaceDetails] = useState(null); //  Additional Google Places information
  const [loadingDetails, setLoadingDetails] = useState(true); // Track loading status
  const [detailsError, setDetailsError] = useState(""); //Track API errors

  // --------------------------------------------------
  // Load favourite status whenever this screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!place?.id) return;

      let active = true;

      async function loadFavouriteStatus() {
        try {
          setLoadingFavourite(true);

          const favourites = await getFavourites();

          const saved = favourites.some((item) => item.id === place.id);

          if (active) {
            setIsSaved(saved);
            setLoadingFavourite(false);
          }
        } catch (error) {
          console.log("Favourite loading error:", error);

          if (active) {
            Alert.alert("Error", "Unable to retrieve favourite status.");
          }
        }
      }

      loadFavouriteStatus();

      return () => {
        active = false;
      };
    }, [place?.id]),
  );

  // --------------------------------------------------
  //Retrieve additional place details
  useEffect(() => {
    if (!place?.id || place.detailsUnavailable) {
      setLoadingDetails(false);
      return;
    }

    let active = true;

    async function loadPlaceDetails() {
      try {
        setLoadingDetails(true);
        setDetailsError("");
        setPlaceDetails(null);

        // Reference the Firebase Cloud Function
        const getPlaceDetails = httpsCallable(
          firebase_functions,
          "getPlaceDetails",
        );

        // Send the selected Google Place ID
        const result = await getPlaceDetails({
          placeId: place.id,
        });

        // Retrieve returned detailed information
        const details = result.data?.details ?? null;

        console.log("Selected place details:", details);

        if (active) {
          if (!details) {
            setDetailsError(
              "Unable to retrieve additional location information.",
            );
          } else {
            setPlaceDetails(details);
          }
        }
      } catch (error) {
        console.log("Place details error:", error.code, error.message);

        if (active) {
          setDetailsError("Unable to load additional location information.");
        }
      } finally {
        if (active) {
          setLoadingDetails(false);
        }
      }
    }

    loadPlaceDetails();

    return () => {
      active = false;
    };
  }, [place?.id, place?.detailsUnavailable]);

  // --------------------------------------------------
  // Save or remove the selected place
  async function toggleFavourite() {
    if (
      !place?.id ||
      place.detailsUnavailable ||
      updatingFavourite ||
      loadingFavourite
    ) {
      return;
    }

    try {
      setUpdatingFavourite(true);

      if (isSaved) {
        await removeFavourite(place.id);
        setIsSaved(false);
      } else {
        await saveFavourite(place);
        setIsSaved(true);
      }
    } catch (error) {
      console.log("Favourite update error:", error);

      Alert.alert("Error", "Unable to update saved places.");
    } finally {
      setUpdatingFavourite(false);
    }
  }

  // --------------------------------------------------
  // Open external navigation URL
  async function openMapURL(url) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log("Navigation error:", error);

      Alert.alert(
        "Unable to Open Maps",
        "Please check whether a navigation application or browser is available.",
      );
    }
  }

  // --------------------------------------------------
  // Get directions to selected place
  function getDirections() {
    const latitude = place?.latitude;
    const longitude = place?.longitude;

    // Validate destination coordinates
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert(
        "Location Unavailable",
        "This location does not have valid GPS coordinates.",
      );
      return;
    }

    const coordinates = `${latitude},${longitude}`;

    // Google Maps directions URL
    let googleMapsURL =
      "https://www.google.com/maps/dir/?api=1" +
      `&destination=${encodeURIComponent(coordinates)}`;

    // Include Google Place ID when available
    if (place.id && place.source === "google") {
      googleMapsURL += `&destination_place_id=${encodeURIComponent(place.id)}`;
    }

    // Apple Maps directions URL
    const appleMapsURL =
      "https://maps.apple.com/?" + `daddr=${encodeURIComponent(coordinates)}`;

    // iOS users can choose Google Maps or Apple Maps
    if (Platform.OS === "ios") {
      Alert.alert(
        "Get Directions",
        `Choose a navigation application to get directions to ${place.name}.`,
        [
          {
            text: "Google Maps",
            onPress: () => openMapURL(googleMapsURL),
          },
          {
            text: "Apple Maps",
            onPress: () => openMapURL(appleMapsURL),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
      );
    } else {
      // Android users open Google Maps
      openMapURL(googleMapsURL);
    }
  }

  // --------------------------------------------------
  // Handle missing or unavailable place information
  if (!place || place.detailsUnavailable) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#333" />

          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={45} color="#B5BA74" />

          <Text style={styles.emptyText}>
            Location information is currently unavailable.
          </Text>
        </View>
      </View>
    );
  }

  const hasCoordinates =
    Number.isFinite(place.latitude) && Number.isFinite(place.longitude);

  const dogFriendlyText =
    placeDetails?.allowsDogs === true
      ? "Dogs are allowed."
      : placeDetails?.allowsDogs === false
        ? "Dogs are not allowed."
        : "Dog-friendly information is not available.";

  // --------------------------------------------------
  // Screen interface
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#333" />

          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Favourite button */}
        <Pressable
          style={styles.heartButton}
          onPress={toggleFavourite}
          disabled={loadingFavourite || updatingFavourite}
          accessibilityLabel={
            isSaved ? "Remove from saved places" : "Save place"
          }
        >
          <Ionicons
            name={isSaved ? "heart" : "heart-outline"}
            size={25}
            color="#F46C6C"
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Place Photo */}
        <PlacePhoto place={place} style={styles.placePhoto} />

        {/* Place Name */}
        <Text style={styles.placeName}>{place.name ?? "Unnamed Place"}</Text>

        {/* Shared category and distance information */}
        <View style={styles.placeInfo}>
          <PlaceInfo place={place} />
        </View>

        <View style={styles.divider} />

        {/* Additional information */}
        <Text style={styles.sectionTitle}>About this location</Text>

        {/* Loading, error and success states */}
        {loadingDetails ? (
          // Display while retrieving Google Places information
          <View style={styles.detailsLoading}>
            <ActivityIndicator size="small" color="#8F9E42" />

            <Text style={styles.informationText}>
              Loading location information...
            </Text>
          </View>
        ) : detailsError ? (
          // Display if the API request fails
          <Text style={styles.detailsError}>{detailsError}</Text>
        ) : (
          // Display actual information returned by Google
          <>
            {/* Description */}
            {placeDetails?.description ? (
              <Text style={styles.description}>{placeDetails.description}</Text>
            ) : null}

            {/* Address */}
            <View style={styles.informationRow}>
              <Ionicons name="location-outline" size={21} color="#8F9E42" />

              <View style={styles.informationContent}>
                <Text style={styles.informationTitle}>Address</Text>

                <Text style={styles.informationText}>
                  {placeDetails?.address || "Address not available."}
                </Text>
              </View>
            </View>

            {/* Opening hours */}
            <View style={styles.informationRow}>
              <Ionicons name="time-outline" size={21} color="#8F9E42" />

              <View style={styles.informationContent}>
                <Text style={styles.informationTitle}>Opening Hours</Text>

                {placeDetails?.openingHours?.length > 0 ? (
                  placeDetails.openingHours.map((hour, index) => (
                    <Text key={index} style={styles.informationText}>
                      {hour}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.informationText}>
                    Opening hours not available.
                  </Text>
                )}
              </View>
            </View>

            {/* Dog-friendly information */}
            <View style={styles.informationRow}>
              <Ionicons name="paw-outline" size={21} color="#8F9E42" />

              <View style={styles.informationContent}>
                <Text style={styles.informationTitle}>
                  Dog-friendly Information
                </Text>

                <Text style={styles.informationText}>{dogFriendlyText}</Text>

                {placeDetails?.allowsDogs === true && (
                  <Text style={styles.informationText}>
                    Check local leash requirements and park regulations before
                    visiting.
                  </Text>
                )}
              </View>
            </View>

            {/* Additional third-party attributions */}
            {placeDetails?.attributions?.map((item, index) => (
              <Text
                key={index}
                style={[
                  styles.sourceText,
                  item.providerUri?.startsWith("https://") &&
                    styles.attributionLink,
                ]}
                onPress={
                  item.providerUri?.startsWith("https://")
                    ? () => openMapURL(item.providerUri)
                    : undefined
                }
              >
                {item.provider}
              </Text>
            ))}
          </>
        )}

        {/* Google Places attribution */}
        <Text style={styles.sourceText}>Google Maps</Text>

        {/* Get Directions Button */}
        <Pressable
          style={[
            styles.directionButton,
            !hasCoordinates && styles.disabledButton,
          ]}
          onPress={getDirections}
          disabled={!hasCoordinates}
          accessibilityRole="button"
        >
          <Ionicons name="navigate" size={19} color="#333" />

          <Text style={styles.directionButtonText}>Get Directions</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    paddingTop: 55,
    paddingHorizontal: 22,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },

  backText: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#333",
  },

  heartButton: {
    padding: 6,
  },

  scrollContent: {
    paddingBottom: 35,
  },

  placePhoto: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 14,
    overflow: "hidden",
  },

  placeName: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 21,
    color: "#222",
    marginTop: 16,
    marginBottom: 10,
  },

  placeInfo: {
    marginBottom: 20,
  },

  divider: {
    height: 1,
    backgroundColor: "#DDD",
    marginBottom: 22,
  },

  sectionTitle: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 16,
    color: "#222",
    marginBottom: 12,
  },

  description: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#666",
    lineHeight: 21,
    marginBottom: 22,
  },

  informationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },

  informationContent: {
    flex: 1,
    gap: 5,
  },

  informationTitle: {
    fontFamily: "PawPath-Medium",
    fontSize: 13,
    color: "#333",
  },

  informationText: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#666",
    lineHeight: 19,
  },

  sourceText: {
    fontFamily: "PawPath-Regular",
    fontSize: 10,
    color: "#777",
    textAlign: "right",
    marginBottom: 12,
  },

  directionButton: {
    backgroundColor: "#D4D88E",
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 10,
  },

  directionButtonText: {
    fontFamily: "PawPath-Medium",
    fontSize: 14,
    color: "#333",
  },

  disabledButton: {
    opacity: 0.5,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
  },

  emptyText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#777",
    textAlign: "center",
  },
  detailsLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
    marginBottom: 15,
  },
  detailsError: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#777",
    lineHeight: 19,
    marginBottom: 20,
  },
});
