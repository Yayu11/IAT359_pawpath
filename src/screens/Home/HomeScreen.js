// import { signOut } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import {
  StyleSheet,
  Text,
  Image,
  View,
  Pressable,
  ScrollView,
} from "react-native";

import { firebase_auth } from "../../firebaseConfig";
import { samplePlaces } from "../../data/samplePlaces";

export default function HomeScreen({ navigation }) {
  const user = firebase_auth.currentUser;
  const suggestedPlaces = samplePlaces.slice(0, 4);
  const [updatingId, setUpdatingId] = useState(null);
  const [savedIds, setSavedIds] = useState([]);

  return (
    <View style={styles.container}>
      <Text style={styles.logoTitle}>Pawpath</Text>

      <Text style={styles.title}>Hi, {user?.displayName || "User"} </Text>

      {/* plan for today */}
      <View style={styles.planContainer}>
        <Pressable style={styles.activityPlan}>
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
        <Text style={styles.subtitle}>Suggested Trails</Text>
      </View>
      <View style={styles.suggestionsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardList}
        >
          {suggestedPlaces.map((place) => (
            <View key={place.id} style={styles.placeCard}>
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
    padding: 20,
  },
  logoTitle: {
    fontSize: 20,
    fontFamily: "PawPath-Bold",
    color: "#000",
    marginTop: 25,
    marginBottom: 5,
  },
  title: {
    fontSize: 25,
    fontFamily: "PawPath-Regular",
    marginTop: 20,
    marginBottom: 20,
  },

  subtitle: {
    fontSize: 16,
    fontFamily: "PawPath-Regular",
    marginTop: 40,
  },

  email: {
    fontSize: 14,
    fontFamily: "PawPath-Regular",
    color: "#666",
    marginBottom: 30,
  },

  button: {
    backgroundColor: "#D4D88E",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },

  buttonText: {
    fontSize: 16,
    fontFamily: "PawPath-regular",
    justifyContent: "flex-end",
    textAlign: "center",
  },

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

  beginButton: {
    backgroundColor: "#D4D88E",
    padding: 40,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
  },

  logoImg: {
    width: 100,
    height: 100,
  },
  suggestionsSection: {
    backgroundColor: "#FEFCFA",
    paddingTop: 18,
    paddingBottom: 20,
  },
  placeCard: {
    width: 200,
    marginLeft: 18,
    backgroundColor: "#CFE5FD",
    borderRadius: 8,
    overflow: "hidden",
  },

  imageContainer: {
    height: 150,
  },

  placeImage: {
    width: "100%",
    height: "100%",
  },
  placeName: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#333",
    padding: 12,
  },
});
