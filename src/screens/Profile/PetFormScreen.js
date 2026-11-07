import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { firebase_auth } from "../../firebaseConfig";

import {
  initializeProfileDB,
  addPet,
  updatePet,
  getPet,
} from "../../utils/profileDB";

import { chooseProfilePhoto } from "../../utils/profileImages";

export default function PetFormScreen({ navigation, route }) {
  // Check whether the user is adding or editing a pet
  const petId = route.params?.petId;
  const isEditing = petId != null;

  // Form state
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [birthday, setBirthday] = useState(new Date());
  const [birthdaySelected, setBirthdaySelected] = useState(false);
  const [sex, setSex] = useState("");
  const [photoUri, setPhotoUri] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSexOptions, setShowSexOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(isEditing);

  // Firebase authenticated user
  const user = firebase_auth.currentUser;

  // Load existing pet information when editing
  useEffect(() => {
    let active = true;

    async function loadPet() {
      if (!isEditing || !user) {
        if (active) setInitializing(false);
        return;
      }

      try {
        await initializeProfileDB();

        const pet = await getPet(petId, user.uid);

        if (!active) return;

        if (!pet) {
          Alert.alert("Not Found", "Pet profile not found.");
          navigation.goBack();
          return;
        }

        setName(pet.name || "");
        setBreed(pet.breed || "");
        setSex(pet.sex || "");
        setPhotoUri(pet.photo_uri || null);

        if (pet.birthday) {
          const [y, m, d] = pet.birthday.split("-").map(Number);

          setBirthday(new Date(y, m - 1, d));
          setBirthdaySelected(true);
        }
      } catch (error) {
        if (active) {
          Alert.alert("Error", error.message);
        }
      } finally {
        if (active) setInitializing(false);
      }
    }

    loadPet();

    return () => {
      active = false;
    };
  }, [petId, isEditing, user?.uid, navigation]);

  // Select pet photo from phone gallery
  async function handleSelectPhoto() {
    try {
      const uri = await chooseProfilePhoto();

      if (uri) {
        setPhotoUri(uri);
      }
    } catch (error) {
      Alert.alert("Photo Error", error.message);
    }
  }

  // Calculate pet age from birthday
  function getAge() {
    if (!birthdaySelected) return "";

    const today = new Date();
    let years = today.getFullYear() - birthday.getFullYear();

    const beforeBirthday =
      today.getMonth() < birthday.getMonth() ||
      (today.getMonth() === birthday.getMonth() &&
        today.getDate() < birthday.getDate());

    if (beforeBirthday) years--;

    return `${Math.max(0, years)} year(s)`;
  }

  // Display date as DD MM YYYY
  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${day} ${month} ${date.getFullYear()}`;
  }

  // Store date as YYYY-MM-DD
  function databaseDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Save new pet or update existing pet
  async function handleSave() {
    if (saving || initializing) return;

    if (!user) {
      Alert.alert("Error", "Please sign in again.");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Missing Information", "Please enter your pet's name.");
      return;
    }

    if (!birthdaySelected) {
      Alert.alert("Missing Information", "Please select a birthday.");
      return;
    }

    if (birthday > new Date()) {
      Alert.alert("Invalid Date", "Birthday cannot be in the future.");
      return;
    }

    const pet = {
      name: name.trim(),
      breed: breed.trim(),
      birthday: databaseDate(birthday),
      sex,
      photoUri,
    };

    try {
      setSaving(true);

      await initializeProfileDB();

      if (isEditing) {
        await updatePet(petId, user.uid, pet);
      } else {
        await addPet(user.uid, pet);
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert("Save Failed", error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back button */}
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Your Furry Friend</Text>

      {/* Pet photo */}
      <Pressable style={styles.photoBox} onPress={handleSelectPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.selectedPhoto} />
        ) : (
          <>
            <Ionicons name="image" size={42} color="#444" />

            <Text style={styles.photoText}>Add your furry's photos</Text>
          </>
        )}
      </Pressable>

      {/* Pet information */}
      <View style={styles.fields}>
        <TextInput
          style={styles.field}
          placeholder="Pet Name"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.field}
          placeholder="Breed"
          placeholderTextColor="#666"
          value={breed}
          onChangeText={setBreed}
        />

        {/* Birthday */}
        <Pressable
          style={styles.fieldRow}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.fieldText}>Birthday</Text>

          <Text style={styles.dateText}>
            {birthdaySelected ? formatDate(birthday) : "Select Date"}
          </Text>
        </Pressable>

        {showDatePicker && (
          <View>
            <DateTimePicker
              value={birthday}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (Platform.OS === "android") {
                  setShowDatePicker(false);
                }

                if (event.type === "set" && selectedDate) {
                  setBirthday(selectedDate);
                  setBirthdaySelected(true);
                }
              }}
            />

            {Platform.OS === "ios" && (
              <Pressable
                onPress={() => setShowDatePicker(false)}
                style={styles.dateDone}
              >
                <Text style={styles.dateDoneText}>Done</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Age */}
        <View style={styles.field}>
          <Text style={styles.fieldText}>
            Age: {getAge() || "Select birthday first"}
          </Text>
        </View>

        {/* Sex */}
        <Pressable
          style={styles.fieldRow}
          onPress={() => setShowSexOptions(!showSexOptions)}
        >
          <Text style={styles.fieldText}>{sex || "Sex"}</Text>

          <Ionicons name="chevron-down" size={18} />
        </Pressable>

        {showSexOptions && (
          <View style={styles.sexOptions}>
            {["Male", "Female"].map((option) => (
              <Pressable
                key={option}
                style={styles.sexOption}
                onPress={() => {
                  setSex(option);
                  setShowSexOptions(false);
                }}
              >
                <Text style={styles.fieldText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Save / Discard buttons */}
      <View style={styles.buttons}>
        <Pressable
          style={styles.addButton}
          onPress={handleSave}
          disabled={saving || initializing}
        >
          <Text style={styles.buttonText}>
            {saving
              ? "Saving..."
              : initializing
                ? "Loading..."
                : isEditing
                  ? "Save Changes"
                  : "Add"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.discardButton}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.buttonText}>Discard</Text>
        </Pressable>
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
    flexGrow: 1,
    paddingHorizontal: 27,
    paddingTop: 85,
    paddingBottom: 30,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 20,
  },

  backText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
  },

  title: {
    fontFamily: "PawPath-Bold",
    fontSize: 23,
    textAlign: "center",
    marginBottom: 18,
  },

  photoBox: {
    height: 300,
    borderWidth: 3,
    borderStyle: "dashed",
    borderColor: "#CFE5FD",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: 8,
  },

  selectedPhoto: {
    width: "100%",
    height: "100%",
  },

  photoText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
  },

  fields: {
    marginTop: 24,
    gap: 10,
  },

  field: {
    backgroundColor: "#CFE5FD",
    minHeight: 46,
    borderRadius: 9,
    paddingHorizontal: 14,
    justifyContent: "center",
    fontFamily: "PawPath-Regular",
    fontSize: 13,
  },

  fieldRow: {
    backgroundColor: "#CFE5FD",
    minHeight: 46,
    borderRadius: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  fieldText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#444",
  },

  dateText: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontFamily: "PawPath-Regular",
    fontSize: 12,
  },

  dateDone: {
    alignSelf: "flex-end",
    padding: 10,
  },

  dateDoneText: {
    fontFamily: "PawPath-SemiBold",
  },

  sexOptions: {
    borderRadius: 9,
    backgroundColor: "#E8F2FE",
    overflow: "hidden",
  },

  sexOption: {
    padding: 13,
  },

  buttons: {
    marginTop: 45,
    gap: 12,
  },

  addButton: {
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },

  discardButton: {
    borderColor: "#D4D88E",
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },

  buttonText: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 16,
    color: "#333",
  },
});
