import { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { firebase_auth } from "../../firebaseConfig";
import { initializeProfileDB, getPet } from "../../utils/profileDB";

export default function PetDetailScreen({ route, navigation }) {
  const { petId } = route.params;

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load pet information from SQLite
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadPet() {
        try {
          const user = firebase_auth.currentUser;

          if (!user) {
            if (active) setLoading(false);
            return;
          }

          await initializeProfileDB();

          const savedPet = await getPet(petId, user.uid);

          if (active) {
            setPet(savedPet);
          }
        } catch (error) {
          console.log("Pet detail error:", error);
          if (active) {
            Alert.alert("Error", "Unable to load pet details.");
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadPet();

      return () => {
        active = false;
      };
    }, [petId]),
  );

  // Format birthday: YYYY-MM-DD -> DD-MM-YYYY
  function formatBirthday(value) {
    if (!value) return "Not set";

    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  // Calculate age automatically
  function calculateAge(value) {
    if (!value) return "-";

    const [year, month, day] = value.split("-").map(Number);
    const today = new Date();

    let age = today.getFullYear() - year;

    if (
      today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month && today.getDate() < day)
    ) {
      age--;
    }

    return String(Math.max(0, age));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D4D88E" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Pet profile not found.</Text>
      </View>
    );
  }

  // First row uses saved pet data.
  // Second row uses placeholder activity statistics.
  const information = [
    { label: "Breed", value: pet.breed || "-" },
    { label: "Age", value: calculateAge(pet.birthday) },
    { label: "Sex", value: pet.sex || "-" },
    { label: "Walks per day", value: "1.5" },
    { label: "Total Activity", value: "1000" },
    { label: "Avg. Walk", value: "35mins" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Pet cover photo */}
      {pet.photo_uri ? (
        <Image
          source={{ uri: pet.photo_uri }}
          style={styles.coverPhoto}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.coverPlaceholder}>
          <Image
            source={require("../../../assets/img/cat.png")}
            style={styles.catIcon}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={styles.body}>
        {/* Pet name and birthday */}
        <Text style={styles.petName}>{pet.name}</Text>

        <Text style={styles.birthday}>
          Birthday: {formatBirthday(pet.birthday)}
        </Text>

        {/* Pet information cards */}
        <View style={styles.statsGrid}>
          {information.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Activities */}
        <Text style={styles.sectionTitle}>Activities</Text>

        {/* Placeholder activity card */}
        <View style={styles.activityCard}>
          <View style={styles.activityImage}>
            <Ionicons name="image-outline" size={34} color="#666" />
            <Text style={styles.placeholderText}>Walk Photo</Text>
          </View>

          <View style={styles.activityInfo}>
            <Text style={styles.activityPetName}>{pet.name}'s</Text>

            <Text style={styles.activityTitle}>Saturday Walk</Text>

            <Text style={styles.activityDescription}>
              Distance: 2.5km Time: 37mins
            </Text>

            <Text style={styles.activityDescription}>Bathroom Breaks: 2</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
  },

  content: {
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontFamily: "PawPath-Regular",
    fontSize: 15,
  },

  // Pet cover photo
  coverPhoto: {
    width: "100%",
    height: 255,
  },

  coverPlaceholder: {
    width: "100%",
    height: 255,
    backgroundColor: "#D4D88E",
    alignItems: "center",
    justifyContent: "center",
  },

  catIcon: {
    width: 80,
    height: 80,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  // Pet name and birthday
  petName: {
    fontFamily: "PawPath-Regular",
    fontSize: 27,
    color: "#000",
    marginBottom: 2,
  },

  birthday: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#666",
  },

  // Information grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginTop: 28,
  },

  statCard: {
    width: "31.5%",
    height: 78,
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  statLabel: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 11,
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },

  statValue: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#555",
    textAlign: "center",
  },

  // Activities
  sectionTitle: {
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    color: "#444",
    marginTop: 28,
    marginBottom: 20,
  },

  activityCard: {
    flexDirection: "row",
    backgroundColor: "#CFE5FD",
    borderRadius: 15,
    overflow: "hidden",
    height: 150,
  },

  activityImage: {
    width: "38%",
    backgroundColor: "#B6CDB2",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  placeholderText: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#555",
  },

  activityInfo: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 13,
  },

  activityPetName: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#555",
  },

  activityTitle: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 15,
    color: "#000",
    marginBottom: 8,
  },

  activityDescription: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 17,
  },
});
