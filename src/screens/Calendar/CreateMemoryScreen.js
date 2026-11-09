import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import MonthCalendar from "../../components/MonthCalendar";

import {
  formatDate,
  formatDisplayDate,
  saveMemory,
  getMemoryById,
  updateMemory,
} from "../../utils/calendarStorage";

// Folder used only for photos taken with PawPath's camera
const CAMERA_FOLDER = `${FileSystem.documentDirectory}pawpath-camera/`;

// Folder used for photos attached to saved memories
const MEMORY_FOLDER = `${FileSystem.documentDirectory}pawpath-memories/`;

export default function CreateMemoryScreen({ navigation, route }) {
  //  Determine whether this is Create or Edit mod
  const memoryId = route.params?.memoryId;
  const isEditing = Boolean(memoryId);

  // Memory form states
  const [imageUri, setImageUri] = useState(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(isEditing);
  const [originalImageUri, setOriginalImageUri] = useState(null); // Remember the original saved image

  // Photo menu and gallery states
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showAppGallery, setShowAppGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Camera states
  const [facing, setFacing] = useState("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const cameraRef = useRef(null);

  // Load existing memory information in Edit mode
  useEffect(() => {
    let active = true;

    async function loadExistingMemory() {
      if (!isEditing) {
        setInitializing(false);
        return;
      }

      try {
        setInitializing(true);

        const existingMemory = await getMemoryById(memoryId);

        if (!active) return;

        if (!existingMemory) {
          Alert.alert("Not Found", "Memory not found.");
          navigation.goBack();
          return;
        }

        // Fill the form with previously saved information
        setImageUri(existingMemory.imageUri || null);
        setOriginalImageUri(existingMemory.imageUri || null);
        setCaption(existingMemory.caption || "");
        setLocation(existingMemory.location || "");
        setDate(existingMemory.date || formatDate(new Date()));
      } catch (error) {
        console.log("Load memory error:", error);

        if (active) {
          Alert.alert("Error", error.message || "Unable to load the memory.");
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    loadExistingMemory();

    return () => {
      active = false;
    };
  }, [memoryId, isEditing, navigation]);

  // Load saved photos from PawPath's camera folder
  async function loadAppGallery() {
    try {
      setGalleryLoading(true);

      // Check whether the camera folder exists
      const folderInfo = await FileSystem.getInfoAsync(CAMERA_FOLDER);

      if (!folderInfo.exists) {
        setGalleryPhotos([]);
        return;
      }

      // Retrieve filenames saved in the camera folder
      const filenames = await FileSystem.readDirectoryAsync(CAMERA_FOLDER);

      // folder only contains PawPath camera photos
      const photos = filenames
        .sort((a, b) => b.localeCompare(a))
        .map((name) => `${CAMERA_FOLDER}${name}`);

      // Similar to setPhotos() in the lecture demo
      setGalleryPhotos(photos);
    } catch (error) {
      console.log("Gallery loading error:", error);
      Alert.alert("Error", "Unable to load PawPath Gallery.");
    } finally {
      setGalleryLoading(false);
    }
  }

  //Open PawPath Gallery
  async function openAppGallery() {
    setShowPhotoMenu(false);

    // Refresh photos whenever the gallery opens
    await loadAppGallery();

    setShowAppGallery(true);
  }

  //Select an existing photo from PawPath Gallery
  function selectAppPhoto(uri) {
    setImageUri(uri);
    setShowAppGallery(false);
  }

  // Select a photo from the phone's photo library
  async function pickImage() {
    try {
      const photoPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!photoPermission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Image picker error:", error);
      Alert.alert("Error", "Unable to select a photo.");
    }
  }

  // Open PawPath's in-app camera
  async function openCamera() {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();

        if (!result.granted) {
          Alert.alert("Permission Required", "Please allow camera access.");
          return;
        }
      }

      setIsCameraReady(false);
      setShowCamera(true);
    } catch (error) {
      console.log("Camera permission error:", error);
      Alert.alert("Error", "Unable to open the camera.");
    }
  }

  // Switch between front and back cameras
  function toggleCamera() {
    setIsCameraReady(false);

    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  // Take a photo and save it immediately
  async function takePhoto() {
    if (!cameraRef.current || !isCameraReady || capturing) {
      return;
    }

    try {
      setCapturing(true);

      // Capture photo with CameraView
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        //Create camera folder if needed
        await FileSystem.makeDirectoryAsync(CAMERA_FOLDER, {
          intermediates: true,
        });

        //Create a unique photo filename
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.jpg`;

        const savedCameraUri = `${CAMERA_FOLDER}${fileName}`;

        //Copy captured photo into local app storage
        await FileSystem.copyAsync({
          from: photo.uri,
          to: savedCameraUri,
        });

        // Update gallery state using the same
        setGalleryPhotos((previousPhotos) => [
          savedCameraUri,
          ...previousPhotos,
        ]);

        // Show the photo in the Create Memory form
        setImageUri(savedCameraUri);

        setShowCamera(false);
        setIsCameraReady(false);
      }
    } catch (error) {
      console.log("Camera capture error:", error);
      Alert.alert("Error", "Unable to take a photo.");
    } finally {
      setCapturing(false);
    }
  }

  // Close the camera
  function closeCamera() {
    setShowCamera(false);
    setIsCameraReady(false);
  }

  // Show photo source options
  function showPhotoOptions() {
    setShowPhotoMenu(true);
  }

  // Save memory details to Firestore
  async function handleSaveMemory() {
    if (loading || initializing) return;

    if (!imageUri || !caption.trim() || !location.trim()) {
      Alert.alert(
        "Missing Information",
        "Please add a photo, caption and location.",
      );
      return;
    }

    let newSavedImageUri = null;
    let memorySaved = false;

    try {
      setLoading(true);

      // Only copy an image if creating a new memory or replacing the image while editing
      const imageChanged = !isEditing || imageUri !== originalImageUri;

      let finalImageUri = imageUri;

      if (imageChanged) {
        await FileSystem.makeDirectoryAsync(MEMORY_FOLDER, {
          intermediates: true,
        });

        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-memory.jpg`;

        newSavedImageUri = `${MEMORY_FOLDER}${fileName}`;

        await FileSystem.copyAsync({
          from: imageUri,
          to: newSavedImageUri,
        });

        finalImageUri = newSavedImageUri;
      }

      // Same data structure for both Create and Edit
      const memoryData = {
        imageUri: finalImageUri,
        caption: caption.trim(),
        location: location.trim(),
        date,
      };

      // Choose between updating and creating
      if (isEditing) {
        await updateMemory(memoryId, memoryData);
        console.log("Memory updated:", memoryId);
      } else {
        const newMemoryId = await saveMemory(memoryData);
        console.log("Memory created:", newMemoryId);
      }

      memorySaved = true;

      navigation.goBack();
    } catch (error) {
      console.log("Save memory error:", error);

      // Remove a newly created memory copy if Firestore saving fails
      if (newSavedImageUri && !memorySaved) {
        try {
          await FileSystem.deleteAsync(newSavedImageUri, {
            idempotent: true,
          });
        } catch (cleanupError) {
          console.log("Cleanup error:", cleanupError);
        }
      }

      Alert.alert("Error", error.message || "Unable to save your memory.");
    } finally {
      setLoading(false);
    }
  }

  // Display a loading screen while retrieving an existing memory
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8F9E42" />
        <Text style={styles.loadingText}>Loading memory...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={19} color="#333" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Screen title */}
        <Text style={styles.title}>
          {isEditing ? "Edit Memory" : "Create Memory"}
        </Text>

        {/* Photo preview */}
        <Pressable
          style={styles.imageBox}
          onPress={showPhotoOptions}
          disabled={loading}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.selectedImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image" size={43} color="#333" />

              <Text style={styles.imageText}>
                Add your furry friend's photos
              </Text>

              <Text style={styles.imageHint}>
                Tap to open Camera or Gallery
              </Text>
            </View>
          )}
        </Pressable>

        {/* Caption input */}
        <TextInput
          style={styles.input}
          placeholder="Add a caption..."
          placeholderTextColor="#5E5E5E"
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        {/* Location input */}
        <View style={styles.locationRow}>
          <Ionicons name="location-sharp" size={20} color="#222" />

          <TextInput
            style={styles.locationInput}
            placeholder="Add Location"
            placeholderTextColor="#5E5E5E"
            value={location}
            onChangeText={setLocation}
            multiline
          />
        </View>

        {/* Date selection */}
        <View style={styles.dateContainer}>
          <View style={styles.dateHeader}>
            <Text style={styles.dateLabel}>Date</Text>

            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{formatDisplayDate(date)}</Text>
            </View>
          </View>

          <MonthCalendar selectedDate={date} onSelectDate={setDate} compact />
        </View>

        {/* Save / Discard buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.saveButton}
            onPress={handleSaveMemory}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? "SAVING..."
                : isEditing
                  ? "Save Changes"
                  : "Save Memory"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.discardButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {isEditing ? "Cancel" : "Discard"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/*Photo source menu */}
      <Modal
        visible={showPhotoMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoMenu(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              {isEditing ? "Change Photo" : "Add Photo"}
            </Text>

            {/* Camera option */}
            <Pressable
              style={styles.optionRow}
              onPress={() => {
                setShowPhotoMenu(false);
                openCamera();
              }}
            >
              <Ionicons name="camera-outline" size={22} color="#222" />
              <Text style={styles.optionText}>Take Photo</Text>
            </Pressable>

            {/* Phone photo library */}
            <Pressable
              style={styles.optionRow}
              onPress={() => {
                setShowPhotoMenu(false);
                pickImage();
              }}
            >
              <Ionicons name="images-outline" size={22} color="#222" />
              <Text style={styles.optionText}>Phone Photo Library</Text>
            </Pressable>

            {/* PawPath Gallery */}
            <Pressable style={styles.optionRow} onPress={openAppGallery}>
              <Ionicons name="albums-outline" size={22} color="#222" />
              <Text style={styles.optionText}>PawPath Gallery</Text>
            </Pressable>

            {/* Cancel */}
            <Pressable
              style={styles.cancelOption}
              onPress={() => setShowPhotoMenu(false)}
            >
              <Text style={styles.optionText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* PawPath Gallery based on lecture demo */}
      <Modal
        visible={showAppGallery}
        animationType="slide"
        onRequestClose={() => setShowAppGallery(false)}
      >
        <View style={styles.galleryContainer}>
          {/* Gallery header */}
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle}>PawPath Gallery</Text>

            <Pressable onPress={() => setShowAppGallery(false)}>
              <Ionicons name="close" size={27} color="#222" />
            </Pressable>
          </View>

          {/* Conditional rendering from lecture demo */}
          {galleryLoading ? (
            <Text style={styles.galleryMessage}>Loading photos...</Text>
          ) : galleryPhotos.length === 0 ? (
            <View style={styles.emptyGallery}>
              <Ionicons name="images-outline" size={45} color="#777" />

              <Text style={styles.galleryMessage}>
                No photos yet. Take a photo using PawPath Camera!
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.galleryGrid}>
              {/* .map() approach from lecture demo */}
              {galleryPhotos.map((uri) => (
                <Pressable
                  key={uri}
                  style={styles.galleryCell}
                  onPress={() => selectAppPhoto(uri)}
                >
                  <Image source={{ uri }} style={styles.galleryImage} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* In-app camera modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={closeCamera}
      >
        <View style={styles.cameraContainer}>
          {showCamera && permission?.granted && (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing={facing}
              ref={cameraRef}
              onCameraReady={() => setIsCameraReady(true)}
            />
          )}

          {/* Close camera */}
          <Pressable
            style={styles.closeCameraButton}
            onPress={closeCamera}
            disabled={capturing}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>

          {/* Camera controls */}
          <View style={styles.cameraControls}>
            <View style={styles.cameraSideControl} />

            {/* Capture button */}
            <Pressable
              style={[
                styles.snapButton,
                (!isCameraReady || capturing) && {
                  opacity: 0.5,
                },
              ]}
              onPress={takePhoto}
              disabled={!isCameraReady || capturing}
            >
              <View style={styles.snapInnerCircle} />
            </Pressable>

            {/* Flip camera */}
            <Pressable
              style={styles.cameraSideControl}
              onPress={toggleCamera}
              disabled={capturing}
            >
              <Ionicons name="camera-reverse-outline" size={30} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
  },
  // Loading state for Edit mode
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    color: "#555",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 85,
    paddingBottom: 35,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginBottom: 20,
  },

  backText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#222",
  },

  title: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 23,
    color: "#222",
    textAlign: "center",
    marginBottom: 20,
  },

  imageBox: {
    height: 270,
    borderWidth: 2,
    borderColor: "#CFE5FD",
    borderStyle: "dashed",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 25,
  },

  selectedImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  imageText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#333",
  },

  imageHint: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#777",
  },

  input: {
    backgroundColor: "#CFE5FD",
    borderRadius: 8,
    padding: 15,
    minHeight: 48,
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    marginBottom: 15,
    justifyContent: "center",
    textAlignVertical: "center",
  },

  locationRow: {
    backgroundColor: "#CFE5FD",
    borderRadius: 8,
    paddingHorizontal: 15,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },

  locationInput: {
    flex: 1,
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    color: "#222",
  },

  dateContainer: {
    backgroundColor: "#CFE5FD",
    borderRadius: 10,
    padding: 12,
  },

  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  dateLabel: {
    fontFamily: "PawPath-Medium",
    fontSize: 14,
  },

  datePill: {
    backgroundColor: "#FEFCFA",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  datePillText: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
  },

  buttonContainer: {
    marginTop: 70,
    gap: 12,
  },

  saveButton: {
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },

  discardButton: {
    borderWidth: 2,
    borderColor: "#D4D88E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },

  buttonText: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 15,
    color: "#222",
  },

  // Photo source menu styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  dialog: {
    backgroundColor: "#FEFCFA",
    borderRadius: 14,
    padding: 20,
  },

  dialogTitle: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 19,
    marginBottom: 12,
    color: "#222",
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
  },

  optionText: {
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    color: "#222",
  },

  cancelOption: {
    alignItems: "center",
    paddingTop: 18,
  },

  // PawPath Gallery styles
  galleryContainer: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    paddingTop: 55,
  },

  galleryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 18,
  },

  galleryTitle: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 22,
    color: "#222",
  },

  // Grid layout adapted from lecture demo
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    justifyContent: "flex-start",
  },

  galleryCell: {
    width: "33.33%",
    padding: 5,
    aspectRatio: 3 / 4,
  },

  galleryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#ccc",
  },

  emptyGallery: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },

  galleryMessage: {
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 15,
  },

  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  closeCameraButton: {
    position: "absolute",
    top: 60,
    right: 25,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    zIndex: 10,
  },

  cameraControls: {
    position: "absolute",
    bottom: 45,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    zIndex: 10,
  },

  cameraSideControl: {
    width: 55,
    alignItems: "center",
    justifyContent: "center",
  },

  snapButton: {
    width: 75,
    height: 75,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },

  snapInnerCircle: {
    width: 58,
    height: 58,
    borderRadius: 30,
    backgroundColor: "#FFF",
  },
});
