import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { firebase_auth } from "../../firebaseConfig";

import {
  initializeProfileDB,
  getUserProfile,
  saveUserPhoto,
  getPets,
} from "../../utils/profileDB";

import { chooseProfilePhoto } from "../../utils/profileImages";

export default function ProfileScreen({ navigation }) {
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [pets, setPets] = useState([]);

  // Current authenticated Firebase user
  const user = firebase_auth.currentUser;
  const username = user?.displayName || "Pet Parent";

  // Load user profile and pet information from SQLite
  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      await initializeProfileDB();

      const profile = await getUserProfile(user.uid);
      const savedPets = await getPets(user.uid);

      setProfilePhoto(profile?.photo_uri || null);
      setPets(savedPets);
    } catch (error) {
      console.log("Profile loading error:", error);
      Alert.alert("Error", "Unable to load profile.");
    }
  }, [user?.uid]);

  // Reload profile when returning to this screen
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  // Change user's profile photo
  async function handleChangePhoto() {
    if (!user) return;

    try {
      const uri = await chooseProfilePhoto();

      if (!uri) return;

      await saveUserPhoto(user.uid, uri);
      setProfilePhoto(uri);
    } catch (error) {
      Alert.alert("Photo Error", error.message);
    }
  }

  // Navigate to Add Pet screen
  function openAddPet() {
    navigation.navigate("PetForm");
  }

  // Navigate to Edit Pet screen
  function openEditPet() {
    if (pets.length === 1) {
      navigation.navigate("PetForm", {
        petId: pets[0].id,
      });
    } else if (pets.length > 1) {
      Alert.alert("Edit Pet", "Select a pet to edit.", [
        ...pets.map((pet) => ({
          text: pet.name,
          onPress: () =>
            navigation.navigate("PetForm", {
              petId: pet.id,
            }),
        })),
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    }
  }

  // Navigate to Pet Detail screen
  function openPetDetail(petId) {
    navigation.navigate("PetDetail", {
      petId: petId,
    });
  }

  // Format birthday for display
  function formatBirthday(value) {
    if (!value) return "";

    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* User profile */}
      <View style={styles.userRow}>
        <Pressable style={styles.avatarWrapper} onPress={handleChangePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person-outline" size={34} color="#555" />
            </View>
          )}

          {/* Edit profile photo icon */}
          <Image
            source={require("../../../assets/img/edit_profile_icon.png")}
            style={styles.editIcon}
            resizeMode="contain"
          />
        </Pressable>

        <Text style={styles.username}>{username}</Text>
      </View>

      {/* Pet section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your furry friends</Text>

        {/* Add and Edit buttons */}
        {pets.length > 0 && (
          <View style={styles.actions}>
            <Pressable style={styles.smallButton} onPress={openAddPet}>
              <Text style={styles.smallButtonText}>Add</Text>
            </Pressable>

            <Pressable style={styles.smallButton} onPress={openEditPet}>
              <Text style={styles.smallButtonText}>Edit</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Empty pet state */}
      {pets.length === 0 ? (
        <Pressable style={styles.emptyPetCard} onPress={openAddPet}>
          <Image
            source={require("../../../assets/img/cat.png")}
            style={styles.catIcon}
            resizeMode="contain"
          />

          <Text style={styles.addPetText}>Add your Pet Profile</Text>
        </Pressable>
      ) : (
        // Display saved pet profiles
        pets.map((pet) => (
          <Pressable
            key={pet.id}
            style={styles.petCard}
            onPress={() => openPetDetail(pet.id)}
          >
            {/* Pet profile photo */}
            {pet.photo_uri ? (
              <Image
                source={{ uri: pet.photo_uri }}
                style={styles.petPhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.petPhotoPlaceholder}>
                <Image
                  source={require("../../../assets/img/cat.png")}
                  style={styles.catIcon}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Pet information */}
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>

              {pet.birthday && (
                <Text style={styles.petBirthday}>
                  Birthday: {formatBirthday(pet.birthday)}
                </Text>
              )}
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 40,
  },

  // User profile
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 45,
    marginBottom: 40,
    gap: 16,
  },

  avatarWrapper: {
    width: 75,
    height: 75,
    position: "relative",
  },

  avatar: {
    width: 75,
    height: 75,
    borderRadius: 38,
  },

  avatarPlaceholder: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: "#D4D88E",
    alignItems: "center",
    justifyContent: "center",
  },

  editIcon: {
    width: 20,
    height: 20,
    position: "absolute",
    right: 0,
    bottom: 0,
  },

  username: {
    fontFamily: "PawPath-Medium",
    fontSize: 27,
    color: "#000",
  },

  // Pet section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  sectionTitle: {
    fontFamily: "PawPath-Regular",
    fontSize: 15,
    color: "#454545",
  },

  actions: {
    flexDirection: "row",
    gap: 8,
  },

  smallButton: {
    backgroundColor: "#D4D88E",
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 5,
  },

  smallButtonText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
  },

  // Empty pet card
  emptyPetCard: {
    backgroundColor: "#D4D88E",
    borderRadius: 6,
    height: 125,
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },

  catIcon: {
    width: 48,
    height: 48,
  },

  addPetText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
  },

  // Saved pet cards
  petCard: {
    backgroundColor: "#D4D88E",
    borderRadius: 20,
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 130,
    marginBottom: 14,
  },

  petPhoto: {
    width: 130,
    height: 130,
  },

  petPhotoPlaceholder: {
    width: 130,
    height: 130,
    backgroundColor: "#C6CE88",
    alignItems: "center",
    justifyContent: "center",
  },

  petInfo: {
    flex: 1,
    padding: 15,
    justifyContent: "flex-start",
    gap: 7,
  },

  petName: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 16,
    color: "#000",
  },

  petBirthday: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#555",
  },
});
