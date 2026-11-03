import { signOut } from "firebase/auth";

import { Alert, StyleSheet, Text, View, Pressable } from "react-native";

import { firebase_auth } from "../firebaseConfig";

export default function HomeScreen() {
  const user = firebase_auth.currentUser;

  async function handleSignOut() {
    try {
      await signOut(firebase_auth);
    } catch (error) {
      console.log(error.message);
      Alert.alert("Sign Out Failed", error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to PawPath!</Text>

      <Text style={styles.subtitle}>You have successfully logged in.</Text>

      <Text style={styles.email}>{user?.email}</Text>

      <Pressable style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>SIGN OUT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  title: {
    fontSize: 25,
    fontFamily: "PawPath-Bold",
    marginBottom: 15,
  },

  subtitle: {
    fontSize: 16,
    fontFamily: "PawPath-Regular",
    marginBottom: 10,
  },

  email: {
    fontSize: 14,
    fontFamily: "PawPath-Regular",
    color: "#666",
    marginBottom: 30,
  },

  button: {
    backgroundColor: "#D4D88E",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },

  buttonText: {
    fontSize: 16,
    fontFamily: "PawPath-Bold",
  },
});
