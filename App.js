import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "./src/firebaseConfig.js";

export default function App() {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");

  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const [results, setResults] = useState("");

  function clearFields() {
    setName("");
    setType("");
    setLocation("");
  }

  // Function to insert new plant into Firestore
  async function insertNewPlant() {
    try {
      const docRef = await addDoc(collection(db, "plants"), {
        name: name,
        type: type,
        location: location,
      });
      console.log("Document written with ID: ", docRef.id);
      clearFields();
      Alert.alert(
        `Plant "${name}" in "${location}" location inserted into db.`,
      );
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }

  // Function to retrieve all plants from Firestore
  async function getPlants() {
    try {
      const querySnapshot = await getDocs(collection(db, "plants"));
      let allPlants = []; // Array to store plant data
      querySnapshot.forEach((doc) => {
        console.log(doc.id, "=>", doc.data());
        allPlants.push(
          `${JSON.stringify(doc.data().name)}: ${JSON.stringify(doc.data().type)} and in ${JSON.stringify(doc.data().location)}`,
        );
      });
      setResults(allPlants.join("\n"));
    } catch (error) {
      console.error("Error fetching plants:", error);
    }
  }

  // Function to filter plants based on name, type, or location
  async function filterPlants() {
    try {
      let whereArr = [];

      // Conditionally add filters to query
      if (filterName) whereArr.push(where("name", "==", filterName));
      if (filterType) whereArr.push(where("type", "==", filterType));
      if (filterLocation)
        whereArr.push(where("location", "==", filterLocation));

      const q = query(collection(db, "plants"), ...whereArr);
      const querySnapshot = await getDocs(q);

      let filteredPlants = [];

      if (querySnapshot.empty) {
        console.log("No matching plants found.");
        setResults("No matching plants found.");
      } else {
        querySnapshot.forEach((doc) => {
          console.log(doc.id, "=>", doc.data());
          filteredPlants.push(
            `${JSON.stringify(doc.data().name)} in ${JSON.stringify(doc.data().location)}`,
          );
        });
        setResults(filteredPlants.join("\n"));
      }
    } catch (error) {
      console.error("Error filtering plants:", error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>My Plants</Text>

      <TouchableOpacity onPress={insertNewPlant} style={styles.buttons}>
        <Text>Add Plant</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        onChangeText={setName}
        value={name}
        placeholder="Enter plant name"
      />
      <TextInput
        style={styles.input}
        onChangeText={setType}
        value={type}
        placeholder="Enter plant type"
      />
      <TextInput
        style={styles.input}
        onChangeText={setLocation}
        value={location}
        placeholder="Enter plant location"
      />

      <TouchableOpacity onPress={getPlants} style={styles.buttons}>
        <Text>Show ALL Plants</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={filterPlants} style={styles.buttons}>
        <Text>Filter Plants</Text>
      </TouchableOpacity>

      <View style={styles.filterInputsContainer}>
        <TextInput
          style={styles.filterInputs}
          onChangeText={setFilterName}
          value={filterName}
          placeholder="Plant name"
        />
        <TextInput
          style={styles.filterInputs}
          onChangeText={setFilterType}
          value={filterType}
          placeholder="Plant type"
        />
        <TextInput
          style={styles.filterInputs}
          onChangeText={setFilterLocation}
          value={filterLocation}
          placeholder="Plant location"
        />
      </View>

      <Text style={styles.outputText}>Output Area</Text>
      <Text style={styles.resultsText}>{results}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5", // Light gray background
    padding: 30,
    alignItems: "center", // Center items
  },
  titleText: {
    marginTop: 20,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 24,
    color: "#2C3E50", // Darker blue shade
    marginBottom: 10,
  },
  input: {
    width: "90%",
    height: 50,
    borderWidth: 1,
    borderColor: "#B0BEC5", // Light gray border
    backgroundColor: "#FFFFFF", // White background
    borderRadius: 10, // Rounded corners
    paddingHorizontal: 15,
    marginVertical: 8,
    fontSize: 16,
  },
  buttons: {
    width: "90%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#d46c35",
    height: 50,
    padding: 10,
    marginVertical: 8,
    borderRadius: 10, // Rounded corners
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3, // Android shadow effect
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF", // White text
  },
  filterInputsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "90%",
  },
  filterInputs: {
    width: "32%",
    height: 50,
    borderWidth: 1,
    borderColor: "#B0BEC5", // Light gray border
    backgroundColor: "#FFFFFF", // White background
    borderRadius: 10, // Rounded corners
    paddingHorizontal: 15,
    marginVertical: 8,
    fontSize: 14,
  },
  filterInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: "#B0BEC5",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    marginVertical: 8,
    fontSize: 16,
  },
  outputContainer: {
    width: "90%",
    marginTop: 20,
    backgroundColor: "#ECEFF1",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  outputText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 5,
    marginTop: 15,
  },
  resultsText: {
    width: "90%",
    fontSize: 16,
    color: "#2C3E50",
    textAlign: "center",
    padding: 10,
    borderWidth: 2,
  },
});
