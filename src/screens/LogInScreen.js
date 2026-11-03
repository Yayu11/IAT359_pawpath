import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { firebase_auth } from "../firebaseConfig";

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

export default function LogInScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = firebase_auth;

  //Function to Login an existing user
  async function handleLogIn() {
    if (!email.trim() || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password.",
      );
      return;
    }

    try {
      setLoading(true);

      //Sign in with Firebase Authentication
      const response = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      console.log(response);
      Alert.alert("User logged in:", response.user.email);
    } catch (error) {
      console.log(error.message);
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  //UI
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* PawPath Logo */}
        <View style={styles.logoContainer}>
          {/* <Text style={styles.logo}> LOGO </Text> */}
          <Image
            source={require("../../assets/img/PawPath-Logo icon.png")}
            style={styles.logoImg}
            resizeMode="contain"
            accessibilityLabel="PawPath Logo"
          />
          <Text style={styles.logoText}>PawPath</Text>
        </View>

        {/* Input Fields -Email */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#5E5E5E"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {/* Input Fields - Password */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#5E5E5E"
            secureTextEntry={true} //hides text for security (dots/asterisks)
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.signUpButton}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text style={styles.buttonText}>SIGN UP</Text>
          </Pressable>

          <Pressable
            style={styles.logInButton}
            onPress={handleLogIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "LOGGING IN..." : "LOG IN"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "Forgot Password",
                "Password reset will be added later",
              )
            }
          >
            <Text style={styles.forgotPasswordText}>Forgot your Password?</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    paddingHorizontal: 25,
  },
  content: {
    flexGrow: 1,
    paddingTop: 140,
    paddingBottom: 65,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 45,
  },
  logoImg: {
    width: 85,
    height: 85,
    marginBottom: 15,
  },
  logoText: {
    fontSize: 28,
    // fontWeight: "bold",
    fontFamily: "PawPath-Bold",
    color: "#000",
    marginTop: 10,
  },
  inputContainer: {
    gap: 15,
    marginBottom: 38,
  },
  input: {
    padding: 20,
    backgroundColor: "#CFE5FD",
    borderRadius: 10,
    fontFamily: "PawPath-Regular",
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: "auto",
    gap: 14,
  },
  signUpButton: {
    padding: 15,
    borderWidth: 2.5,
    borderColor: "#D4D88E",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logInButton: {
    padding: 15,
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  forgotPasswordText: {
    fontFamily: "PawPath-Regular",
    color: "#5E5E5E",
    fontSize: 13,
    // marginTop: 5,
    textAlign: "center",
  },
});
