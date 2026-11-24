import { useCallback, useState, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PlacePhoto from "../../components/PlacePhoto";
import PlaceInfo from "../../components/PlaceInfo";

import {
  getFavouritesWithDetails,
  removeFavourite,
} from "../../utils/favouriteStorage";

const EMPTY_PLACES = [];

export default function SavedFavouriteScreen({ navigation, route }) {
  //Reuse nearby place information from MapScreen
  const places = route.params?.places ?? EMPTY_PLACES;

  // Get the current search area's coordinates
  const searchCenter = route.params?.searchCenter ?? null;

  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");

  // Track which place is being removed
  const [removingId, setRemovingId] = useState(null);

  // --------------------------------------------------
  // Track visible rows for photo loading
  const [visibleIds, setVisibleIds] = useState([]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 30,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    setVisibleIds(viewableItems.map((entry) => entry.item.id));
  }).current;

  // --------------------------------------------------
  // READ saved places from Firestore
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadFavourites() {
        try {
          setLoading(true);
          setLoadingError("");

          // Reuse nearby place information
          // and calculate distance from the search area.
          const results = await getFavouritesWithDetails(places, searchCenter);

          if (active) {
            setFavourites(results);
          }
        } catch (error) {
          console.log("Favourite loading error:", error.code, error.message);

          if (active) {
            setLoadingError("Unable to load saved places.");
            Alert.alert("Error", "Unable to load saved places.");
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      loadFavourites();

      return () => {
        active = false;
      };
    }, [places, searchCenter]),
  );

  // --------------------------------------------------
  // DELETE saved place from Firestore
  async function handleRemove(placeId) {
    // Prevent multiple removal requests
    if (removingId !== null) return;

    try {
      setRemovingId(placeId);
      await removeFavourite(placeId);

      setFavourites((previous) =>
        previous.filter((place) => place.id !== placeId),
      );
    } catch (error) {
      Alert.alert("Error", "Unable to remove saved place.");
    } finally {
      setRemovingId(null);
    }
  }

  // --------------------------------------------------
  // Render an individual saved place
  function renderPlace({ item: place }) {
    return (
      <View style={styles.placeRow}>
        {/* Open selected place details */}
        <Pressable
          style={styles.placeContent}
          onPress={() =>
            navigation.navigate("DetailPlace", {
              place,
            })
          }
          disabled={place.detailsUnavailable === true}
        >
          <PlacePhoto
            place={place}
            style={styles.placeImage}
            enabled={visibleIds.includes(place.id)}
          />

          <View style={styles.placeInfo}>
            <Text style={styles.placeName}>
              {place.name ?? "Unnamed Place"}
            </Text>

            <PlaceInfo place={place} />
          </View>
        </Pressable>

        {/* Remove favourite button */}
        <Pressable
          style={styles.heartButton}
          onPress={() => handleRemove(place.id)}
          disabled={removingId !== null}
        >
          <Ionicons name="heart" size={19} color="#F46C6C" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={18} color="#333" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Saved Places</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#8F9E42" style={styles.loader} />
      ) : loadingError ? (
        // Display the actual loading error
        <Text style={styles.emptyText}>{loadingError}</Text>
      ) : favourites.length === 0 ? (
        // Empty state
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={42} color="#B5BA74" />

          <Text style={styles.emptyText}>No saved places yet.</Text>

          <Text style={styles.emptyDescription}>
            Explore nearby parks and trails, then tap the heart icon to save
            your favourite places.
          </Text>
        </View>
      ) : (
        <>
          {/* Source attribution */}
          <Text style={styles.sourceText}>Google Maps</Text>

          {/* Display real saved places */}
          <FlatList
            data={favourites}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderPlace}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            // Control photo loading
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            extraData={{
              visibleIds,
              removingId,
            }}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={3}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    paddingHorizontal: 22,
    paddingTop: 55,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 35,
  },

  backText: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#333",
  },

  title: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 21,
    color: "#222",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#AAA",
  },

  loader: {
    marginTop: 35,
  },

  emptyText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 35,
  },

  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
    gap: 12,
  },

  placeImage: {
    width: 67,
    height: 67,
    borderRadius: 8,
  },

  placeInfo: {
    flex: 1,
    gap: 7,
  },

  placeName: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 14,
    color: "#222",
  },

  detailsText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#444",
  },

  heartButton: {
    borderWidth: 1,
    borderColor: "#D4D88E",
    borderRadius: 7,
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingBottom: 100,
  },

  emptyDescription: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 19,
  },

  list: {
    paddingBottom: 35,
  },

  sourceText: {
    fontSize: 12,
    color: "#555",
    textAlign: "right",
    marginBottom: 5,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  placeContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
