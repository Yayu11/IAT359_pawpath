import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

// Choose and save a profile photo locally
export async function chooseProfilePhoto() {
  // Request permission to access photos
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library permission is required.");
  }

  // Open phone photo library
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  // User canceled selection
  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const selected = result.assets[0];

  // Create folder in app storage
  const folder = FileSystem.documentDirectory + "profile-images/";

  await FileSystem.makeDirectoryAsync(folder, {
    intermediates: true,
  });

  // Determine image extension
  const extension = selected.mimeType === "image/png" ? "png" : "jpg";

  // Generate a unique filename
  const destination =
    folder +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2) +
    "." +
    extension;

  // Copy image into persistent storage
  await FileSystem.copyAsync({
    from: selected.uri,
    to: destination,
  });

  return destination;
}
