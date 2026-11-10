import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CreateWalkScreen({ navigation }) {
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

          <Text style={styles.title}>Create a Walk</Text>
        </View>

        <Pressable
          style={styles.walkButton}
          onPress={() => navigation.navigate("Home", { screen: "SelectPet" })}
        >
          <Text style={styles.buttonText}>Begin Walk</Text>
          <Text style={styles.subText}>
            Start a walk and track your route wherever you go.
          </Text>
        </Pressable>

        <Pressable
          style={styles.walkButton}
          onPress={() => navigation.navigate("Calendar")}
        >
          <Text style={styles.buttonText}>Plan Walk</Text>
          <Text style={styles.subText}>
            Create a weekly itinerary by selecting a trail for each day.
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
    padding: 15,
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
  walkButton: {
    backgroundColor: "#D4D88E",
    padding: 25,
    borderRadius: 12,
    marginBottom: 15,
  },
  buttonText: {
    fontFamily: "PawPath-SemiBold",
  },
  subText: {
    fontFamily: "PawPath-Regular",
    fontSize: 14,
  },
});
