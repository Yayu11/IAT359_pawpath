import { useCallback, useState, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import PlacePhoto from "../../components/PlacePhoto";
import PlaceInfo from "../../components/PlaceInfo";

import {
  getFavourites,
  getFavouritesWithDetails,
  removeFavourite,
  saveFavourite,
} from "../../utils/favouriteStorage";

const EMPTY_PLACES = [];

export default function ChooseLocationScreen({ navigation, route }) {
  //  Get real park data passed through navigation
  const places = route.params?.places ?? EMPTY_PLACES;

  //Get the search area's coordinates
  const searchCenter = route.params?.searchCenter ?? null;

  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("All");
  const [savedIds, setSavedIds] = useState([]);

  // Stores complete favourite objects from Firestore
  const [savedPlaces, setSavedPlaces] = useState([]);

  // Loading states
  const [loadingFavourites, setLoadingFavourites] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedError, setSavedError] = useState("");

  // Prevent repeated favourite updates
  const [updatingId, setUpdatingId] = useState(null);

  // Track visible list items
  const [visibleIds, setVisibleIds] = useState([]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 30,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    setVisibleIds(viewableItems.map((entry) => entry.item.id));
  }).current;

  // --------------------------------------------------
  // Load saved favourites when screen opens
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadFavourites() {
        try {
          const results = await getFavourites();

          if (active) {
            // Store IDs for heart icon states
            setSavedIds(results.map((item) => item.id));
          }
        } catch (error) {
          console.log("Favourite error:", error);
          if (active) {
            Alert.alert("Error", "Unable to load favourites.");
          }
        } finally {
          if (active) {
            setLoadingFavourites(false);
          }
        }
      }

      loadFavourites();

      return () => {
        active = false;
      };
    }, []),
  );

  // --------------------------------------------------
  // Retrieve full saved place information
  // only when the Saved filter is selected
  useFocusEffect(
    useCallback(() => {
      if (filter !== "Saved") {
        setLoadingSaved(false);
        return;
      }

      let active = true;

      async function loadSavedPlaces() {
        try {
          setLoadingSaved(true);
          setSavedError("");

          const results = await getFavouritesWithDetails(places, searchCenter);

          if (active) {
            setSavedPlaces(results);

            setSavedIds(results.map((place) => place.id));
          }
        } catch (error) {
          console.log("Saved places error:", error.message);

          if (active) {
            setSavedError("Unable to load saved places.");
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

      // Include search coordinates
    }, [filter, places, searchCenter]),
  );

  // Save or remove a place
  async function toggleFavourite(place) {
    // Prevent duplicate save/remove requests
    if (updatingId !== null || loadingFavourites || loadingSaved) return;

    try {
      setUpdatingId(place.id);

      if (savedIds.includes(place.id)) {
        await removeFavourite(place.id);

        setSavedIds((previous) => previous.filter((id) => id !== place.id));
        setSavedPlaces((previous) =>
          previous.filter((item) => item.id !== place.id),
        );
      } else {
        await saveFavourite(place);

        setSavedIds((previous) => [...previous, place.id]);
        setSavedPlaces((previous) => [...previous, place]);
      }
    } catch (error) {
      Alert.alert("Error", "Unable to update saved places.");
    } finally {
      setUpdatingId(null);
    }
  }

  // --------------------------------------------------
  // Display all saved places when Saved is selected,
  // including places outside the current search area.
  const availablePlaces = filter === "Saved" ? savedPlaces : places;

  // Filter sample places by search text and type
  const filteredPlaces = availablePlaces.filter((place) => {
    // Search by place name
    const matchesSearch = place.name
      .toLowerCase()
      .includes(searchText.toLowerCase());

    const matchesType =
      filter === "All" || filter === "Saved" || place.type === filter;

    return matchesSearch && matchesType;
  });

  // --------------------------------------------------
  // Empty state messages
  function getEmptyMessage() {
    if (searchText.trim()) {
      return "No matching places found.";
    }

    if (filter === "Saved") {
      return "You haven't saved any places yet.";
    }

    if (filter === "Trail") {
      return "Trail data is not available yet.";
    }

    if (places.length === 0) {
      return "No nearby parks available.";
    }

    return "No matching places found.";
  }

  // --------------------------------------------------
  //  Render an individual place
  function renderPlace({ item: place }) {
    const isSaved = savedIds.includes(place.id);

    return (
      <View style={styles.placeRow}>
        {/* Shared real photo component */}
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

        {/* favourite button */}
        <Pressable
          style={styles.heartButton}
          onPress={() => toggleFavourite(place)}
          disabled={updatingId !== null || loadingFavourites || loadingSaved}
        >
          <Ionicons
            name={isSaved ? "heart" : "heart-outline"}
            size={19}
            color={isSaved ? "#F46C6C" : "#333"}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={25} color="#333" />
        </Pressable>

        <Text style={styles.title}>Location</Text>
      </View>

      {/* Search input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#AAA" />

        <TextInput
          style={styles.searchInput}
          placeholder="Search for location"
          placeholderTextColor="#AAA"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filter buttons */}
      <View style={styles.filterRow}>
        {["All", "Park", "Trail", "Saved"].map((item) => (
          <Pressable
            key={item}
            style={[
              styles.filterButton,
              filter === item && styles.activeFilter, //only apply when one of the filter is selected
            ]}
            onPress={() => setFilter(item)}
          >
            <Text style={styles.filterText}>
              {item === "Park"
                ? "Parks"
                : item === "Trail"
                  ? "Trails"
                  : item === "Saved"
                    ? "Saved places"
                    : "All"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Source attribution */}
      <Text style={styles.sourceText}>Google Maps</Text>

      {/* Places list */}
      {filter === "Saved" && (loadingSaved || loadingFavourites) ? (
        <ActivityIndicator size="large" color="#8F9E42" style={styles.loader} />
      ) : filter === "Saved" && savedError ? (
        <Text style={styles.emptyText}>{savedError}</Text>
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPlace}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          // Only enable photos for visible rows
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          extraData={{
            savedIds,
            updatingId,
            visibleIds,
            loadingFavourites,
          }}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={3}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    paddingHorizontal: 28,
  },

  header: {
    paddingTop: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    height: 100,
  },

  closeButton: {
    position: "absolute",
    left: 0,
    top: 57,
    backgroundColor: "#D4D88E",
    borderRadius: 30,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 18,
    color: "#222",
  },

  searchBar: {
    height: 45,
    borderWidth: 1,
    borderColor: "#B5BA74",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    fontFamily: "PawPath-Regular",
    fontSize: 13,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 20,
  },

  filterButton: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  activeFilter: {
    backgroundColor: "#D4D88E",
    borderColor: "#D4D88E",
  },

  filterText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#333",
  },

  list: {
    paddingBottom: 35,
  },

  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
    gap: 10,
  },

  placeImage: {
    width: 70,
    height: 65,
    borderRadius: 8,
  },
  loader: {
    marginTop: 35,
  },
  placeContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sourceText: {
    fontSize: 12,
    color: "#555",
    textAlign: "right",
    marginBottom: 5,
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

  // detailsRow: {
  //   flexDirection: "row",
  //   flexWrap: "wrap",
  //   gap: 7,
  // },

  // detailText: {
  //   fontFamily: "PawPath-Regular",
  //   fontSize: 10,
  //   color: "#444",
  // },

  heartButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#D4D88E",
    borderRadius: 7,
    padding: 5,
  },

  emptyText: {
    fontFamily: "PawPath-Regular",
    textAlign: "center",
    color: "#777",
    marginTop: 35,
  },
});
