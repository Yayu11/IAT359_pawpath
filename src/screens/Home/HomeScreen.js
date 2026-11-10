// import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  Image,
  View,
  Pressable,
  ScrollView,
} from "react-native";

import { firebase_auth } from "../../firebaseConfig";
import { samplePlaces } from "../../data/samplePlaces";

export default function HomeScreen({ navigation }) {
  const user = firebase_auth.currentUser;
  const suggestedPlaces = samplePlaces.slice(0, 4);
  const [weather, setWeather] = useState(null); //weather
  const [loading, setLoading] = useState(true); // loading state
  const [error, setError] = useState(null);

  // set conditions for weather icon according to weather data
  const getWeatherIcon = (condition) => {
    if (!condition) return "cloud-outline";

    const weather = condition.toLowerCase();

    if (weather.includes("sun")) {
      return "sunny";
    }

    if (weather.includes("cloud")) {
      return "cloud";
    }

    if (weather.includes("rain")) {
      return "rainy";
    }

    if (weather.includes("snow")) {
      return "snow";
    }

    if (weather.includes("thunder")) {
      return "thunderstorm";
    }

    return "partly-sunny";
  };

  // fetch weather data using coordinates
  async function fetchWeather() {
    const username = process.env.EXPO_PUBLIC_USERNAME;

    try {
      const response = await fetch(
        `http://api.geonames.org/findNearByWeatherJSON?lat=49.19&lng=-123.17&username=${username}`,
      );
      const data = await response.json();

      if (response.ok && data.weatherObservation) {
        setWeather(data.weatherObservation);
      } else {
        // Handle cases where API returns an error message in the body
        setError(data.status?.message || "Failed to fetch weather");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchWeather();
  }, []);

  // rendering logic
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.logoTitle}>Pawpath</Text>
      <Text style={styles.title}>Hi, {user?.displayName || "User"} </Text>

      {/* display weather information */}
      <View style={styles.headerInfoContainer}>
        {weather && (
          <View style={styles.weatherCard}>
            <Ionicons
              name={getWeatherIcon(weather.clouds)}
              size={30}
              color="#CFE5FD"
            />
            <View style={styles.weatherInfo}>
              {/* <Text style={styles.cityText}>
                Location: {weather.stationName || "N/A"}
              </Text> */}
              <Text style={styles.tempText}>{weather.temperature}°C</Text>
              <Text style={styles.descText}>Humidity: {weather.humidity}%</Text>
              <Text style={styles.descText}>
                Wind Speed: {weather.windSpeed} m/s
              </Text>
            </View>
          </View>
        )}

        {/* plan for today */}
        <Pressable
          style={styles.activityPlan}
          onPress={() =>
            navigation.navigate("Calendar", { screen: "PlanWalk" })
          }
        >
          <Text style={styles.activityText}>Today's Plan</Text>
          <Text style={styles.activityText}>+ Add Activity</Text>
        </Pressable>
      </View>
      {/* walk button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.beginButton}
          onPress={() => navigation.navigate("SelectPet")}
        >
          <Image
            source={require("../../../assets/img/dog_icon.png")}
            style={styles.logoImg}
            resizeMode="contain"
            accessibilityLabel="Walk Logo"
          />

          <Text style={styles.buttonText}>Begin Walk</Text>
        </Pressable>
        <Text style={styles.subtitle}>Suggested Trails</Text>
      </View>
      <View style={styles.suggestionsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardList}
        >
          {suggestedPlaces.map((place) => (
            <View key={place.id} style={styles.placeCard}>
              <View style={styles.imageContainer}>
                {place.image ? (
                  <Image
                    source={place.image}
                    style={styles.placeImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="leaf-outline" size={35} color="#8F9E42" />
                  </View>
                )}
              </View>

              <Text style={styles.placeName}>{place.name}</Text>
            </View>
          ))}
        </ScrollView>
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
  logoTitle: {
    fontSize: 16,
    fontFamily: "PawPath-Bold",
    color: "#000",
    marginTop: 25,
    marginBottom: 5,
  },
  headerInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 25,
    fontFamily: "PawPath-Regular",
    marginTop: 20,
    marginBottom: 20,
  },

  subtitle: {
    fontSize: 16,
    fontFamily: "PawPath-Regular",
    marginTop: 30,
  },
  button: {
    backgroundColor: "#D4D88E",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },

  buttonText: {
    fontSize: 16,
    fontFamily: "PawPath-regular",
    justifyContent: "flex-end",
    textAlign: "center",
  },

  activityText: {
    fontSize: 14,
    fontFamily: "PawPath-Regular",
  },

  activityPlan: {
    padding: 20,
    width: "50%",
    height: 100,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#D4D88E",
    borderRadius: 12,
  },

  beginButton: {
    backgroundColor: "#D4D88E",
    padding: 40,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
  },

  logoImg: {
    width: 100,
    height: 100,
  },
  // suggested trails styling
  suggestionsSection: {
    backgroundColor: "#FEFCFA",
    paddingTop: 18,
    paddingBottom: 20,
  },
  placeCard: {
    width: 200,
    marginLeft: 18,
    backgroundColor: "#CFE5FD",
    borderRadius: 8,
    overflow: "hidden",
  },

  imageContainer: {
    height: 150,
  },

  placeImage: {
    width: "100%",
    height: "100%",
  },
  placeName: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#333",
    padding: 12,
  },
  // weather styling
  weatherCard: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#FEFCFA",
    marginLeft: 20,
  },
  weatherInfo: {
    flex: 1,
  },
  cityText: {
    fontSize: 14,
    fontFamily: "Pawpath-Medium",
  },
  tempText: {
    fontSize: 28,
    fontFamily: "Pawpath-Bold",
  },
  descText: {
    fontSize: 12,
    fontFamily: "Pawpath-Regular",
    color: "#666",
  },
});
