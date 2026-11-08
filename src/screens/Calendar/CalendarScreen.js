import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MonthCalendar from "../../components/MonthCalendar";
import {
  formatDate,
  getMemories,
  getWalkPlans,
  parseDate,
} from "../../utils/calendarStorage";

export default function CalendarScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [plans, setPlans] = useState([]);
  const [memories, setMemories] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  //Reload records whenever the Calendar screen becomes active
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadCalendar() {
        try {
          setLoading(true);

          const [savedPlans, savedMemories] = await Promise.all([
            getWalkPlans(),
            getMemories(),
          ]);

          if (active) {
            setPlans(savedPlans);
            setMemories(savedMemories);
          }
        } catch (error) {
          console.log("Calendar error:", error);
          if (active) {
            Alert.alert(
              "Calendar Error",
              error.message || "Unable to load calendar data.",
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }
      loadCalendar();

      return () => {
        active = false;
      };
    }, []),
  );

  //Show only future shecduled walks & sort by sheduled date/time
  const upcomingPlans = plans
    .filter((plan) => {
      const shecduledTime = new Date(`${plan.date}T${plan.time}:00`).getTime();

      return Number.isFinite(shecduledTime) && shecduledTime >= Date.now();
    })
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  // display memories on calendar
  const memoryDates = memories.map((memory) => memory.date);

  function handleDatePress(date) {
    setSelectedDate(date);

    if (memoryDates.includes(date)) {
      navigation.navigate("MemoryDetail", { date });
    }
  }

  // Open CreateMemoryScreen or PlanWalkScreen
  function openCreateScreen(screenName) {
    setShowMenu(false);
    navigation.navigate(screenName);
  }

  // Render on walk plan in FlatList
  function renderPlan({ item }) {
    const planDate = parseDate(item.date);

    return (
      <Pressable
        style={styles.planCard}
        onPress={() => navigation.navigate("WalkDetail", { planId: item.id })}
      >
        {/* Date */}
        <View style={styles.dateBox}>
          <Text style={styles.dateNumber}>{planDate.getDate()}</Text>

          <Text style={styles.dateMonth}>
            {planDate.toLocaleDateString("en-US", {
              month: "short",
            })}
          </Text>
        </View>

        {/* Walk plan information */}
        <View style={styles.planInfo}>
          <Text style={styles.planTitle}>{item.title}</Text>

          <Text style={styles.planLocation}>{item.location}</Text>
        </View>

        {/* Scheduled time */}
        <Text style={styles.planTime}>{item.time}</Text>
      </Pressable>
    );
  }

  // UI
  return (
    <View style={styles.container}>
      {/*FlatList replaces ScrollView */}
      <FlatList
        data={upcomingPlans}
        keyExtractor={(item) => item.id}
        renderItem={renderPlan}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // Calendar appears above the plan list
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Calendar</Text>

              <Pressable
                style={styles.plusButton}
                onPress={() => setShowMenu(true)}
              >
                <Ionicons name="add" size={25} color="#000" />
              </Pressable>
            </View>

            <MonthCalendar
              selectedDate={selectedDate}
              onSelectDate={handleDatePress}
              memories={memories}
            />

            <Text style={styles.sectionTitle}>Upcoming plans</Text>
          </>
        }
        // Display loading or empty message
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#D4D88E" />
          ) : (
            <Text style={styles.emptyText}>No upcoming walk plans</Text>
          )
        }
      />

      {/* Bottom menu for creating memories or plans */}
      <Modal
        visible={showMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setShowMenu(false)}
          />

          <View style={styles.modalContent}>
            <Pressable
              style={styles.modalOption}
              onPress={() => openCreateScreen("CreateMemory")}
            >
              <Text style={styles.modalText}>Create Memory</Text>
            </Pressable>

            <Pressable
              style={styles.modalOption}
              onPress={() => openCreateScreen("PlanWalk")}
            >
              <Text style={styles.modalText}>Plan a Walk</Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.modalText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEFCFA",
  },

  // Applied to the FlatList content
  content: {
    paddingHorizontal: 25,
    paddingTop: 85,
    paddingBottom: 35,
  },

  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 35,
  },

  title: {
    fontFamily: "PawPath-Medium",
    fontSize: 24,
    color: "#000",
  },

  plusButton: {
    position: "absolute",
    right: 0,
    width: 38,
    height: 38,
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    fontFamily: "PawPath-Medium",
    fontSize: 16,
    marginTop: 35,
    marginBottom: 18,
    color: "#000",
  },

  emptyText: {
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    color: "#3F3F3F",
    textAlign: "center",
    marginTop: 20,
  },

  // Walk plan card
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#CFE5FD",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    gap: 12,
  },

  dateBox: {
    backgroundColor: "#FEFCFA",
    width: 55,
    height: 58,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  dateNumber: {
    fontFamily: "PawPath-Bold",
    fontSize: 18,
    color: "#000",
  },

  dateMonth: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#000",
  },

  planInfo: {
    flex: 1,
  },

  planTitle: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 14,
    color: "#000",
  },

  planLocation: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#3F3F3F",
  },

  planTime: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#000",
    alignSelf: "flex-start",
  },

  // Bottom modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  modalContent: {
    backgroundColor: "#FEFCFA",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
    paddingBottom: 25,
  },

  modalOption: {
    padding: 22,
    alignItems: "center",
    borderBottomWidth: 0.8,
    borderBottomColor: "rgba(0,0,0,0.30)",
  },

  modalText: {
    fontFamily: "PawPath-Medium",
    fontSize: 16,
    color: "#000",
  },

  cancelButton: {
    padding: 15,
    alignItems: "center",
    borderTopWidth: 4,
    borderTopColor: "#D4D88E",
  },
});
