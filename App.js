import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { onAuthStateChanged } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";

//fonts
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

//screens
import { firebase_auth } from "./src/firebaseConfig";
import LogInScreen from "./src/screens/LogInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import HomeScreen from "./src/screens/HomeScreen";

//Initialize navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

//Temporary placeholder for other tabs
function PlaceholderScreen({ route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.name} Screen</Text>
      <Text>This screen will be added later</Text>
    </View>
  );
}

function ProtectedLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#8F9E42",
        tabBarInactiveTintColor: "#3F3F3F",
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = "home-outline";
          } else if (route.name === "Map") {
            iconName = "map-outline";
          } else if (route.name === "Add") {
            iconName = "add-circle-outline";
          } else if (route.name === "Calendar") {
            iconName = "calendar-outline";
          } else if (route.name === "Profile") {
            iconName = "paw-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={PlaceholderScreen} />
      <Tab.Screen
        name="Add"
        component={PlaceholderScreen}
        options={{ tabBarLabel: "" }}
      />
      <Tab.Screen name="Calendar" component={PlaceholderScreen} />
      <Tab.Screen name="Profile" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  //state to store authenticated user
  const [user, setUser] = useState(null);

  //check whether Firebase has finished Loading
  const [loading, setLoading] = useState(true);

  // Load custom fonts
  const [fontsLoaded, fontError] = useFonts({
    "PawPath-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
    "PawPath-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
    "PawPath-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "PawPath-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
  });

  //Listern for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebase_auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Wait for fonts and Firebase
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (fontError) {
    return (
      <View style={styles.container}>
        <Text>Unable to load custom fonts.</Text>
      </View>
    );
  }

  //Display Loading indicator while checking authentication
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="ProtectedArea" component={ProtectedLayout} />
        ) : (
          <>
            <Stack.Screen name="LogIn" component={LogInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "PawPath-Bold",
    marginBottom: 15,
  },
  tabBar: {
    backgroundColor: "#FAF9F6",
    paddingTop: 5,
    paddingBottom: 8,
  },
  tabBarLabel: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
  },
});

// import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
// import { useState } from "react";
// import {
//   Alert,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { db } from "./src/firebaseConfig.js";

// export default function App() {
//   const [name, setName] = useState("");
//   const [type, setType] = useState("");
//   const [location, setLocation] = useState("");

//   const [filterName, setFilterName] = useState("");
//   const [filterType, setFilterType] = useState("");
//   const [filterLocation, setFilterLocation] = useState("");

//   const [results, setResults] = useState("");

//   function clearFields() {
//     setName("");
//     setType("");
//     setLocation("");
//   }

//   // Function to insert new plant into Firestore
//   async function insertNewPlant() {
//     try {
//       const docRef = await addDoc(collection(db, "plants"), {
//         name: name,
//         type: type,
//         location: location,
//       });
//       console.log("Document written with ID: ", docRef.id);
//       clearFields();
//       Alert.alert(
//         `Plant "${name}" in "${location}" location inserted into db.`,
//       );
//     } catch (e) {
//       console.error("Error adding document: ", e);
//     }
//   }

//   // Function to retrieve all plants from Firestore
//   async function getPlants() {
//     try {
//       const querySnapshot = await getDocs(collection(db, "plants"));
//       let allPlants = []; // Array to store plant data
//       querySnapshot.forEach((doc) => {
//         console.log(doc.id, "=>", doc.data());
//         allPlants.push(
//           `${JSON.stringify(doc.data().name)}: ${JSON.stringify(doc.data().type)} and in ${JSON.stringify(doc.data().location)}`,
//         );
//       });
//       setResults(allPlants.join("\n"));
//     } catch (error) {
//       console.error("Error fetching plants:", error);
//     }
//   }

//   // Function to filter plants based on name, type, or location
//   async function filterPlants() {
//     try {
//       let whereArr = [];

//       // Conditionally add filters to query
//       if (filterName) whereArr.push(where("name", "==", filterName));
//       if (filterType) whereArr.push(where("type", "==", filterType));
//       if (filterLocation)
//         whereArr.push(where("location", "==", filterLocation));

//       const q = query(collection(db, "plants"), ...whereArr);
//       const querySnapshot = await getDocs(q);

//       let filteredPlants = [];

//       if (querySnapshot.empty) {
//         console.log("No matching plants found.");
//         setResults("No matching plants found.");
//       } else {
//         querySnapshot.forEach((doc) => {
//           console.log(doc.id, "=>", doc.data());
//           filteredPlants.push(
//             `${JSON.stringify(doc.data().name)} in ${JSON.stringify(doc.data().location)}`,
//           );
//         });
//         setResults(filteredPlants.join("\n"));
//       }
//     } catch (error) {
//       console.error("Error filtering plants:", error);
//     }
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.titleText}>My Plants</Text>

//       <TouchableOpacity onPress={insertNewPlant} style={styles.buttons}>
//         <Text>Add Plant</Text>
//       </TouchableOpacity>

//       <TextInput
//         style={styles.input}
//         onChangeText={setName}
//         value={name}
//         placeholder="Enter plant name"
//       />
//       <TextInput
//         style={styles.input}
//         onChangeText={setType}
//         value={type}
//         placeholder="Enter plant type"
//       />
//       <TextInput
//         style={styles.input}
//         onChangeText={setLocation}
//         value={location}
//         placeholder="Enter plant location"
//       />

//       <TouchableOpacity onPress={getPlants} style={styles.buttons}>
//         <Text>Show ALL Plants</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={filterPlants} style={styles.buttons}>
//         <Text>Filter Plants</Text>
//       </TouchableOpacity>

//       <View style={styles.filterInputsContainer}>
//         <TextInput
//           style={styles.filterInputs}
//           onChangeText={setFilterName}
//           value={filterName}
//           placeholder="Plant name"
//         />
//         <TextInput
//           style={styles.filterInputs}
//           onChangeText={setFilterType}
//           value={filterType}
//           placeholder="Plant type"
//         />
//         <TextInput
//           style={styles.filterInputs}
//           onChangeText={setFilterLocation}
//           value={filterLocation}
//           placeholder="Plant location"
//         />
//       </View>

//       <Text style={styles.outputText}>Output Area</Text>
//       <Text style={styles.resultsText}>{results}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F5F5F5", // Light gray background
//     padding: 30,
//     alignItems: "center", // Center items
//   },
//   titleText: {
//     marginTop: 20,
//     textAlign: "center",
//     fontWeight: "bold",
//     fontSize: 24,
//     color: "#2C3E50", // Darker blue shade
//     marginBottom: 10,
//   },
//   input: {
//     width: "90%",
//     height: 50,
//     borderWidth: 1,
//     borderColor: "#B0BEC5", // Light gray border
//     backgroundColor: "#FFFFFF", // White background
//     borderRadius: 10, // Rounded corners
//     paddingHorizontal: 15,
//     marginVertical: 8,
//     fontSize: 16,
//   },
//   buttons: {
//     width: "90%",
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#d46c35",
//     height: 50,
//     padding: 10,
//     marginVertical: 8,
//     borderRadius: 10, // Rounded corners
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 3,
//     elevation: 3, // Android shadow effect
//   },
//   buttonText: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#FFFFFF", // White text
//   },
//   filterInputsContainer: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "space-between",
//     width: "90%",
//   },
//   filterInputs: {
//     width: "32%",
//     height: 50,
//     borderWidth: 1,
//     borderColor: "#B0BEC5", // Light gray border
//     backgroundColor: "#FFFFFF", // White background
//     borderRadius: 10, // Rounded corners
//     paddingHorizontal: 15,
//     marginVertical: 8,
//     fontSize: 14,
//   },
//   filterInput: {
//     flex: 1,
//     height: 50,
//     borderWidth: 1,
//     borderColor: "#B0BEC5",
//     backgroundColor: "#FFFFFF",
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     marginHorizontal: 5,
//     marginVertical: 8,
//     fontSize: 16,
//   },
//   outputContainer: {
//     width: "90%",
//     marginTop: 20,
//     backgroundColor: "#ECEFF1",
//     borderRadius: 10,
//     padding: 15,
//     alignItems: "center",
//   },
//   outputText: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#2C3E50",
//     marginBottom: 5,
//     marginTop: 15,
//   },
//   resultsText: {
//     width: "90%",
//     fontSize: 16,
//     color: "#2C3E50",
//     textAlign: "center",
//     padding: 10,
//     borderWidth: 2,
//   },
// });
