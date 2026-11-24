import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import Geocoder from "react-native-geocoding";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function StartWalkScreen({ navigation }) {
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;
  console.log(apiKey);

  // Map state management
  const [currentLocation, setCurrentLocation] = useState(null); // stores user's GPS coords
  // initialize Geocoder with Google Maps API Key
  Geocoder.init(apiKey);

  //Camera state management
  const [facing, setFacing] = useState("back"); // initial back camera
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);

  const [showSuccessText, setShowSuccessText] = useState(false);
  const cameraRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);

  // reference to MapView for camera animations
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

  const handleOpenCamera = async () => {
    try {
      let result = permission;

      // Request permission if it hasn't been granted
      if (!permission?.granted) {
        result = await requestPermission();
      }

      if (result.granted) {
        setIsCameraReady(false);
        setShowCamera(true);
      } else {
        alert("Camera permission is required.");
      }
    } catch (error) {
      console.log("Camera permission error:", error);
    }
  };

  //change cameras front and back
  const toggleCamera = () =>
    setFacing((current) => (current === "back" ? "front" : "back"));

  // function to take picture
  async function takePicture() {
    if (cameraRef.current && isCameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
        });
        const base64Image = `data:image/jpg;base64,${photo.base64}`;

        addPhoto(base64Image);

        // show the success message, then hide it after 1 second
        setShowSuccessText(true);
        setTimeout(() => {
          setShowSuccessText(false);
        }, 1000);
      } catch (error) {
        console.log("Capture error: ", error);
      }
    }
  }

  return (
    <View style={styles.container}>
      {showCamera ? (
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            ref={cameraRef}
            onCameraReady={() => setIsCameraReady(true)}
          />

          {/* conditional Success Message */}
          {showSuccessText && (
            <View style={styles.toastContainer}>
              <Text style={styles.toastText}>Photo Saved!</Text>
            </View>
          )}

          <View style={styles.cameraOverlay}>
            <View style={styles.sideControl}>
              <TouchableOpacity style={styles.camButton} onPress={toggleCamera}>
                <Text style={styles.camButtonText}>Flip</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.snapButton, !isCameraReady && { opacity: 0.5 }]}
              onPress={takePicture}
              disabled={!isCameraReady}
            >
              <Text style={styles.camButtonText}>Snap</Text>
            </TouchableOpacity>
            <View style={styles.sideControl}>
              <TouchableOpacity
                style={styles.camButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.camButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
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
                <Pressable
                  style={styles.endWalkButton}
                  onPress={handleOpenCamera}
                >
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
      )}
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

  //CAMERA STYLING
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 10,
  },
  sideControl: {
    width: 80,
    alignItems: "center",
  },
  camButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  camButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  snapButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
  },
});
