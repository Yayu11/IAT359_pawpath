import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";

import { firebase_auth, db } from "../firebaseConfig";

export default function SignUpScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  //State for gender dropdown
  const [showGenderOptions, setShowGenderOptions] = useState(false);

  //state for loading
  const [loading, setLoading] = useState(false);

  //function to create a new user account
  async function handleSignUp() {
    if (!username.trim() || !gender || !email.trim() || !password) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 6 characters.",
      );
      return;
    }

    try {
      setLoading(true);

      //Create user with Firebase Authentication
      const response = await createUserWithEmailAndPassword(
        firebase_auth,
        email.trim(),
        password,
      );

      //Get the newly created user
      const user = response.user;

      //Save username to Firebse Authentication profile
      await updateProfile(user, {
        displayName: username.trim(),
      });

      //Save user information to Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username.trim(),
        gender: gender,
        email: user.email,
      });
      console.log("Account created:", user.email);
    } catch (error) {
      console.log(error.message);
      Alert.alert("Sign Up Failed", error.message);
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <View style={styles.headerContainer}>
          {/* <Text style={styles.logoImg}>LOGO_IMG</Text> */}
          <Image
            source={require("../../assets/img/PawPath-Logo icon.png")}
            style={styles.logoImg}
            resizeMode="contain"
            accessibilityLabel="PawPath Logo"
          />
          <Text style={styles.logoTitle}>Sign Up</Text>
          <Text style={styles.subtitle}>Create an account to get started!</Text>
        </View>

        {/* Registration Form */}
        <View style={styles.inputContainer}>
          {/* Username */}
          <TextInput
            style={styles.input}
            placeholder="USER NAME"
            placeholderTextColor="#5E5E5E"
            value={username}
            onChangeText={setUsername}
          />

          {/* Gender Dropdown*/}
          <Pressable
            style={styles.genderInput}
            onPress={() => setShowGenderOptions(!showGenderOptions)}
          >
            <Text style={styles.genderText}>{gender || "GENDER"}</Text>
            <Text style={styles.arrow}>⌄</Text>
          </Pressable>

          {/* Gender Options */}
          {showGenderOptions && (
            <View style={styles.dropdown}>
              <Pressable
                style={styles.dropdownOption}
                onPress={() => {
                  setGender("Female");
                  setShowGenderOptions(false);
                }}
              >
                <Text>Female</Text>
              </Pressable>

              <Pressable
                style={styles.dropdownOption}
                onPress={() => {
                  setGender("Male");
                  setShowGenderOptions(false);
                }}
              >
                <Text>Male</Text>
              </Pressable>
            </View>
          )}

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="EMAIL"
            placeholderTextColor="#5E5E5E"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#5E5E5E"
            secureTextEntry={true} //hides text for security (dots/asterisks)
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Bottom Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.signUpButton}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "CREATING ACCOUNT" : "SIGN UP"}
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate("LogIn")}>
            <Text style={styles.logInText}>Log In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

//stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    fontFamily: "PawPath-Regular",
    paddingHorizontal: 25,
  },
  content: {
    flexGrow: 1,
    paddingTop: 140,
    paddingBottom: 65,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 35,
  },
  logoImg: {
    width: 85,
    height: 85,
    // marginBottom: 15,
  },
  logoTitle: {
    fontSize: 27,
    fontFamily: "PawPath-Bold",
    color: "#000",
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 15,
    color: "#5E5E5E",
    fontFamily: "PawPath-Regular",
  },
  inputContainer: {
    gap: 15,
    marginBottom: 20,
  },
  input: {
    padding: 18,
    backgroundColor: "#FEFCFA",
    borderColor: "#CFE5FD",
    borderWidth: 2,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "PawPath-Regular",
  },
  genderInput: {
    padding: 18,
    backgroundColor: "#FEFCFA",
    borderColor: "#CFE5FD",
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  genderText: {
    fontSize: 14,
    fontFamily: "PawPath-Regular",
    color: "#5E5E5E",
  },
  arrow: {
    fontSize: 18,
    color: "#5E5E5E",
    fontFamily: "PawPath-Regular",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#CFE5FD",
    borderRadius: 10,
    backgroundColor: "#FEFCFA",
    overflow: "hidden",
  },
  dropdownOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#d0d0d0",
  },
  buttonContainer: {
    marginTop: "auto",
    gap: 14,
  },
  signUpButton: {
    padding: 15,
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    // fontWeight: "700",
    fontFamily: "PawPath-SemiBold",
    color: "#000",
  },
  logInText: {
    color: "#5E5E5E",
    fontSize: 15,
    fontFamily: "PawPath-SemiBold",
    textAlign: "center",
  },
});
