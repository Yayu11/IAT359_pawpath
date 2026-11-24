import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

// Shared location information component
export default function PlaceInfo({
  place,
  distanceLabel = "from search area",
}) {
  const isTrail = place.type === "Trail";

  // Handle unavailable place information
  if (place.detailsUnavailable || place.unavailable || !place.type) {
    return <Text style={styles.detailText}>Details currently unavailable</Text>;
  }

  return (
    <View style={styles.detailsRow}>
      {/* Location type with corresponding icon */}
      <View style={styles.typeContainer}>
        <Ionicons
          name={isTrail ? "footsteps-outline" : "leaf-outline"}
          size={14}
          color={isTrail ? "#D88B45" : "#8F9E42"}
        />

        <Text style={styles.detailText}>{place.type}</Text>
      </View>

      {/* Display distance when available */}
      {Number.isFinite(place.distanceKm) && (
        <Text style={styles.detailText}>
          🐾 {place.distanceKm.toFixed(1)} km {distanceLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },

  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  detailText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#444",
  },
});
