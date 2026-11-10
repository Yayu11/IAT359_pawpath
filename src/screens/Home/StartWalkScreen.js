import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, View, Pressable } from "react-native";
import Geocoder from "react-native-geocoding";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { useFocusEffect } from "@react-navigation/native";

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
        // use Google Maps on Android on both Android and iOS
        provider={PROVIDER_GOOGLE}
      />
      <Modal transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          {/* pull up tab */}
          <View style={styles.bottomSheet}>
            <View style={styles.dragLine} />
            <Text style={styles.popTitle}>Your Walk</Text>

            <View style={styles.timerInfo}>
              <Text style={styles.timerLabel}>Walk Duration</Text>
            </View>

            {/* Open camera button */}
            <View style={styles.buttonRow}>
              <Pressable style={styles.endWalkButton}>
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "80%",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  bottomSheet: {
    backgroundColor: "#FEFCFA",
    padding: 25,
    paddingBottom: 40,
  },

  dragLine: {
    width: 45,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#CCC",
    marginBottom: 20,
    alignItems: "center",
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
    backgroundColor: "#CFE5FD",
    padding: 16,
    borderRadius: 7,
    width: "48%",
    alignItems: "center",
  },

  finishText: {
    fontSize: 14,
    fontFamily: "PawPath-Regular",
    color: "#333",
  },
  timerInfo: {
    backgroundColor: "#D4D88E",
    padding: 20,
    marginBottom: 20,
    borderRadius: 7,
  },
});
