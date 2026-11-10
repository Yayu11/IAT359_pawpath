import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  Image,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { firebase_auth } from "../../firebaseConfig";
import { initializeProfileDB, getPets } from "../../utils/profileDB";

export default function SelectPetScreen({ navigation }) {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);

  const user = firebase_auth.currentUser;

  // Load saved pets from profile
  const loadPets = useCallback(async () => {
    if (!user) return;
    try {
      await initializeProfileDB();
      const savedPets = await getPets(user.uid);
      setPets(savedPets);
    } catch (error) {
      console.log("Pet loading error:", error);
      Alert.alert("Error", "Unable to load pets");
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [loadPets]),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={19} color="#FFF" />
          </Pressable>

          <Text style={styles.title}>Select your Pet</Text>
        </View>

        {/* display pets */}
        {pets.map((pet) => (
          <Pressable
            key={pet.id}
            style={[
              styles.petCard,
              (selectedPet === pet.id || selectedPet == "ALL") &&
                styles.selectedPetCard,
            ]}
            onPress={() =>
              setSelectedPet(selectedPet === pet.id ? null : pet.id)
            }
          >
            {pet.photo_uri ? (
              <Image source={{ uri: pet.photo_uri }} style={styles.petPhoto} />
            ) : (
              <View style={styles.petPhotoPlaceholder}>
                <Image
                  source={require("../../../assets/img/cat.png")}
                  style={styles.catIcon}
                  resizeMode="contain"
                />
              </View>
            )}
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>
            </View>
          </Pressable>
        ))}

        {/* select all and start walk buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.selectAll}
            onPress={() => setSelectedPet(selectedPet === "ALL" ? null : "ALL")}
          >
            <Text style={styles.buttonText}>
              {selectedPet === "ALL" ? "Deselect All" : "Select All"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.startWalkButton,
              !selectedPet && styles.disabledButton,
            ]}
            disabled={!selectedPet}
            onPress={() => navigation.navigate("StartWalk")}
          >
            <Text style={styles.buttonText}>Start Walk</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 25,
    fontFamily: "PawPath-SemiBold",
    marginTop: 50,
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
    marginTop: 25,
    borderRadius: 25,
    backgroundColor: "#333",
    borderWidth: 1,
  },
  emptyPetCard: {
    backgroundColor: "#D4D88E",
    borderRadius: 6,
    height: 125,
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  addPetText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
  },
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
  petInfo: {
    flex: 1,
    justifyContent: "center",
    marginLeft: 15,
  },
  petName: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 16,
  },
  selectedPetCard: {
    backgroundColor: "#9ca145",
  },
  buttonContainer: {
    flex: 1,
    marginTop: 320,
    gap: 12,
  },
  buttonText: {
    fontFamily: "PawPath-Regular",
  },
  selectAll: {
    backgroundColor: "#fff",
    borderColor: "#D4D88E",
    borderWidth: 2,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  startWalkButton: {
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#D3D3D3",
  },
});
