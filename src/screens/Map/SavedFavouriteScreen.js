import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { samplePlaces } from "../../data/samplePlaces";

import { getFavourites, removeFavourite } from "../../utils/favouriteStorage";

export default function SavedFavouriteScreen({ navigation }) {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  // READ saved places from Firestore
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadFavourites() {
        try {
          setLoading(true);

          const results = await getFavourites();

          if (active) {
            setFavourites(results);
          }
        } catch (error) {
          console.log("Favourite loading error:", error);

          if (active) {
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
    }, []),
  );

  // DELETE saved place from Firestore
  async function handleRemove(placeId) {
    try {
      await removeFavourite(placeId);

      setFavourites((previous) =>
        previous.filter((place) => place.id !== placeId),
      );
    } catch (error) {
      Alert.alert("Error", "Unable to remove saved place.");
    }
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
      ) : favourites.length === 0 ? (
        <Text style={styles.emptyText}>No saved places yet.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {favourites.map((place) => {
            const sample = samplePlaces.find((item) => item.id === place.id);

            return (
              <View key={place.id} style={styles.placeRow}>
                {sample?.image ? (
                  <Image source={sample.image} style={styles.placeImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="leaf-outline" size={28} color="#8F9E42" />
                  </View>
                )}

                <View style={styles.placeInfo}>
                  <Text style={styles.placeName}>{place.name}</Text>

                  <Text style={styles.detailsText}>
                    {place.type} · 🐾 {place.walkDistance} · {place.difficulty}
                  </Text>
                </View>

                <Pressable
                  style={styles.heartButton}
                  onPress={() => handleRemove(place.id)}
                >
                  <Ionicons name="heart" size={19} color="#F46C6C" />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
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

  imagePlaceholder: {
    width: 67,
    height: 67,
    backgroundColor: "#E8EEDB",
    borderRadius: 8,
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
});
