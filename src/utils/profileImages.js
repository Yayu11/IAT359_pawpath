import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

export async function chooseProfilePhoto() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library permission is required.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return null;

  const selected = result.assets[0];
  const folder = FileSystem.documentDirectory + "profile-images/";

  await FileSystem.makeDirectoryAsync(folder, {
    intermediates: true,
  });

  const extension = selected.mimeType === "image/png" ? "png" : "jpg";

  const destination =
    folder +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2) +
    "." +
    extension;

  await FileSystem.copyAsync({
    from: selected.uri,
    to: destination,
  });

  return destination;
}
