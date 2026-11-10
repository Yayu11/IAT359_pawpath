import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, View, Pressable } from "react-native";
import Geocoder from "react-native-geocoding";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function StartWalkScreen({ navigation }) {
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;
  console.log(apiKey);

  // state management
  const [currentLocation, setCurrentLocation] = useState(null); // stores user's GPS coords
  const [modalVisible, setModalVisible] = useState(true);
  // initialize Geocoder with Google Maps API Key
  Geocoder.init(apiKey);

  // reference to the MapView component to trigger camera animations
  const mapRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // convert the text address in 'searchLocation' into coordinates
  // animate the map to that location
  async function performSearch() {
    try {
      // fetch geocoding data from Google
      const json = await Geocoder.from(searchLocation);
      const location = json.results[0].geometry.location;

      const searchedLocation = {
        latitude: location.lat,
        longitude: location.lng,
        // Delta values determine the "zoom" spread of the view
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

      // smoothly move the camera to the new coordinates
      mapRef.current?.animateCamera(
        { center: searchedLocation, zoom: 15 },
        { duration: 2000 },
      );
    } catch (error) {
      console.warn("Geocoding Error: ", error);
    }
  }
  // useEffect hook: Runs once on mount to request location permissions
  // and fetch the user's current physical position.

  useEffect(() => {
    (async () => {
      // request permission to access device location
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }

      // get current GPS position
      let location = await Location.getCurrentPositionAsync({});

      if (location) {
        setCurrentLocation(location);
        console.log(
          `Current location: lat: ${location.coords.latitude}, lng: ${location.coords.longitude}`,
        );
      } else {
        console.log("Current location not obtained");
      }
    })();
  }, []);

  useEffect(() => {
    let interval;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return [hours, minutes, secs]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  return (
    <View style={styles.container}>
      {/* Map Component */}
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 49.19418,
          longitude: -123.17505,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsMyLocationButton // enable the "Current Location" button
        showsUserLocation // show the blue dot for user's position
      />
      <View style={styles.modalContainer}>
        <View style={styles.bottomSheet}>
          <Text style={styles.popTitle}>Your Walk</Text>

          <View style={styles.timerInfo}>
            <View style={styles.timerTextContainer}>
              <Text style={styles.timerDisplay}>{formatTime(seconds)}</Text>
              <Text style={styles.timerLabel}>Walk Duration</Text>
            </View>

            <Pressable
              style={styles.timerButton}
              onPress={() => setIsRunning(!isRunning)}
            >
              <Ionicons
                name={isRunning ? "pause" : "play"}
                size={25}
                color="#ffff"
              />
            </Pressable>
          </View>

          {/* Open camera button */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.endWalkButton}>
              <Ionicons name="camera-outline" size={22} color="#313131" />

              <Text style={styles.finishText}>Open Camera</Text>
            </Pressable>

            {/* End walk button */}
            <Pressable
              style={styles.endWalkButton}
              onPress={() => navigation.navigate("LogWalk")}
            >
              <Text style={styles.finishText}>Finish Walk</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  modalContainer: {
    justifyContent: "flex-end",
  },

  bottomSheet: {
    backgroundColor: "#FEFCFA",
    padding: 25,
    paddingBottom: 40,
  },

  popTitle: {
    fontSize: 16,
    fontFamily: "PawPath-SemiBold",
    marginBottom: 20,
  },

  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },

  timer: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
  },

  timerLabel: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
    marginBottom: 25,
  },

  endWalkButton: {
    flexDirection: "row",
    backgroundColor: "#CFE5FD",
    padding: 12,
    borderRadius: 7,
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  finishText: {
    fontSize: 14,
    fontFamily: "PawPath-Regular",
    color: "#333",
  },

  //timer button container items
  timerInfo: {
    flexDirection: "row",
    backgroundColor: "#D4D88E",
    padding: 20,
    marginBottom: 20,
    borderRadius: 7,
    justifyContent: "space-between",
  },
  timerButton: {
    padding: 10,
    marginTop: 25,
    borderRadius: 25,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
});
