import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  deleteWalkPlan,
  formatDisplayDate,
  getWalkPlanById,
} from "../../utils/calendarStorage";

export default function WalkDetailScreen({ navigation, route }) {
  const { planId } = route.params;

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadPlan() {
        try {
          setLoading(true);

          const savedPlan = await getWalkPlanById(planId);

          if (active) {
            setPlan(savedPlan);
          }
        } catch (error) {
          console.log("Walk detail error:", error);

          if (active) {
            Alert.alert("Error", "Unable to load walk details.");
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      loadPlan();

      return () => {
        active = false;
      };
    }, [planId]),
  );

  function handleDelete() {
    Alert.alert(
      "Delete Walk Plan",
      "Are you sure you want to delete this plan?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWalkPlan(planId);
              navigation.goBack();
            } catch (error) {
              console.log("Delete plan error:", error);
              Alert.alert("Error", "Unable to delete the plan.");
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8F9E42" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Walk plan not found.</Text>

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Back to Calendar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={19} color="#333" />

            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Pressable
            style={styles.editButton}
            onPress={() => navigation.navigate("PlanWalk", { planId })}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{plan.title}</Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={22} color="#333" />

            <Text style={styles.detailText}>
              {formatDisplayDate(plan.date)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={22} color="#333" />

            <Text style={styles.detailText}>{plan.time}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={22} color="#333" />

            <Text style={styles.detailText}>{plan.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="notifications-outline" size={22} color="#333" />

            <Text style={styles.detailText}>
              Reminder: {plan.reminder ? "On" : "Off"}
            </Text>
          </View>
        </View>

        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete Plan</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEFCFA",
    gap: 15,
  },
  content: {
    paddingHorizontal: 25,
    paddingTop: 75,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 50,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  backText: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
  },
  editButton: {
    backgroundColor: "#D4D88E",
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editText: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 13,
  },
  title: {
    fontFamily: "PawPath-Bold",
    fontSize: 23,
    marginBottom: 25,
  },
  detailsCard: {
    backgroundColor: "#CFE5FD",
    borderRadius: 10,
    padding: 20,
    gap: 22,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailText: {
    flex: 1,
    fontFamily: "PawPath-Regular",
    fontSize: 15,
  },
  deleteButton: {
    marginTop: 45,
    borderWidth: 2,
    borderColor: "#D4D88E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  deleteText: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 15,
  },
  emptyText: {
    fontFamily: "PawPath-Regular",
    fontSize: 16,
  },
  linkText: {
    fontFamily: "PawPath-Medium",
    color: "#8F9E42",
  },
});
