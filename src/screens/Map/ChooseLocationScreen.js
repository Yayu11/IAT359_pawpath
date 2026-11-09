import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  Alert,
  Image,
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
  removeFavourite,
  saveFavourite,
} from "../../utils/favouriteStorage";

export default function ChooseLocationScreen({ navigation }) {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("All");
  const [savedIds, setSavedIds] = useState([]);

  // Load saved favourites when screen opens
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadFavourites() {
        try {
          const results = await getFavourites();

          if (active) {
            setSavedIds(results.map((item) => item.id));
          }
        } catch (error) {
          console.log("Favourite error:", error);
        }
      }

      loadFavourites();

      return () => {
        active = false;
      };
    }, []),
  );

  // Save or remove a place
  async function toggleFavourite(place) {
    try {
      if (savedIds.includes(place.id)) {
        await removeFavourite(place.id);

        setSavedIds((previous) => previous.filter((id) => id !== place.id));
      } else {
        await saveFavourite(place);

        setSavedIds((previous) => [...previous, place.id]);
      }
    } catch (error) {
      Alert.alert("Error", "Unable to update saved places.");
    }
  }

  // Filter sample places by search text and type
  const filteredPlaces = samplePlaces.filter((place) => {
    const matchesSearch = place.name
      .toLowerCase()
      .includes(searchText.toLowerCase());

    const matchesType =
      filter === "All" ||
      place.type === filter ||
      (filter === "Saved" && savedIds.includes(place.id));

    return matchesSearch && matchesType;
  });

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

      {/* Places list */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {filteredPlaces.length === 0 ? (
          <Text style={styles.emptyText}>No matching places found.</Text>
        ) : (
          filteredPlaces.map((place) => (
            <View key={place.id} style={styles.placeRow}>
              {place.image ? (
                <Image source={place.image} style={styles.placeImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="leaf-outline" size={28} color="#8F9E42" />
                </View>
              )}

              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailText}>{place.type}</Text>

                  <Text style={styles.detailText}>🐾 {place.walkDistance}</Text>

                  <Text style={styles.detailText}>
                    {place.difficulty === "Moderate" ? "🟠" : "🟢"}{" "}
                    {place.difficulty}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.heartButton}
                onPress={() => toggleFavourite(place)}
              >
                <Ionicons
                  name={savedIds.includes(place.id) ? "heart" : "heart-outline"}
                  size={19}
                  color={savedIds.includes(place.id) ? "#F46C6C" : "#333"}
                />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
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

  imagePlaceholder: {
    width: 70,
    height: 65,
    borderRadius: 8,
    backgroundColor: "#E8EEDB",
    justifyContent: "center",
    alignItems: "center",
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

  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  detailText: {
    fontFamily: "PawPath-Regular",
    fontSize: 10,
    color: "#444",
  },

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
