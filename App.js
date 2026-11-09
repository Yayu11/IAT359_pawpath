import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { onAuthStateChanged } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";

// Fonts
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

// Firebase
import { firebase_auth } from "./src/firebaseConfig";

// Screens
import LogInScreen from "./src/screens/LogInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import HomeScreen from "./src/screens/HomeScreen";

// Navigation
import CalendarStack from "./src/navigation/CalendarStack";
import ProfileStack from "./src/navigation/ProfileStack";
import MapStack from "./src/navigation/MapStack";

// Initialize navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Temporary placeholder for other tabs
function PlaceholderScreen({ route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.name} Screen</Text>
      <Text>This screen will be added later</Text>
    </View>
  );
}

// Bottom Tab Navigation
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

          return (
            <Ionicons
              name={iconName}
              size={route.name === "Add" ? 42 : size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />

      <Tab.Screen name="Map" component={MapStack} />

      <Tab.Screen
        name="Add"
        component={PlaceholderScreen}
        options={{
          tabBarLabel: "",
          tabBarIconStyle: styles.addTabIcon,
        }}
      />

      <Tab.Screen name="Calendar" component={CalendarStack} />

      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

export default function App() {
  // Store authenticated user
  const [user, setUser] = useState(null);

  // Check Firebase loading
  const [loading, setLoading] = useState(true);

  // Load custom fonts
  const [fontsLoaded, fontError] = useFonts({
    "PawPath-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
    "PawPath-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
    "PawPath-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "PawPath-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
  });

  // Listen for authentication changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebase_auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Hide splash screen when ready
  useEffect(() => {
    if ((fontsLoaded || fontError) && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, loading]);

  // Wait for fonts
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

  // Wait for Firebase
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

  addTabIcon: {
    alignItems: "center",
    height: 40,
    width: 40,
  },
});
