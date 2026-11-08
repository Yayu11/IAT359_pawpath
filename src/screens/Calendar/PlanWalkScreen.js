import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
// timer picker (Scroll UI)
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import MonthCalendar from "../../components/MonthCalendar";
import {
  formatDate,
  formatDisplayDate,
  getWalkPlanById,
  saveWalkPlan,
  updateWalkPlan,
} from "../../utils/calendarStorage";

export default function PlanWalkScreen({ navigation, route }) {
  const planId = route.params?.planId;
  const isEditing = Boolean(planId);

  //Form Data State
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [time, setTime] = useState(""); // time as 24-hour format for Firestore
  const [selectedTime, setSelectedTime] = useState(new Date()); // NEW: Date object used by native DateTimePicker
  const [reminder, setReminder] = useState(false);

  //UI State
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false); // NEW: Controls whether native time picker is visible
  const [loading, setLoading] = useState(false);
  const [initializing, setIntializing] = useState(true);

  // Convert Date object into HH:MM (24-hour format)
  function formatTime(dateObject) {
    const hours = String(dateObject.getHours()).padStart(2, "0");
    const minutes = String(dateObject.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  // Convert stored HH:MM to Date object" Used to restore the selected time when editing
  function parseTime(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);

    const result = new Date();
    result.setHours(hours, minutes, 0, 0);

    return result;
  }

  //Convert 24-hour time into AM/PM for UI ("14:30" -> "2:30 PM")
  function formatDisplayTime(timeString) {
    if (!timeString) return "Select Time";

    const [hours, minutes] = timeString.split(":").map(Number);

    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  // onValueChange handles time selection
  function handleTimeChange(event, selectedDate) {
    if (selectedDate) {
      setSelectedTime(selectedDate);

      // Save in 24-hour format
      setTime(formatTime(selectedDate));
    }

    // Android picker closes after selection
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
  }

  // onDismiss handles picker cancellation
  function handleTimeDismiss() {
    setShowTimePicker(false);
  }

  //Load the default reminder preference or an existing plan
  useEffect(() => {
    // Track whether this screen's effect is still active
    let active = true;

    async function loadForm() {
      try {
        if (isEditing) {
          const plan = await getWalkPlanById(planId);

          if (!plan) {
            Alert.alert("Not Found", "Walk plan not found");
            navigation.goBack();
            return;
          }

          if (active) {
            setTitle(plan.title);
            setLocation(plan.location);
            setDate(plan.date || formatDate(new Date()));
            setTime(plan.time || "");
            if (plan.time) {
              setSelectedTime(parseTime(plan.time));
            }
            setReminder(Boolean(plan.reminder));
          }
        } else {
          const savedPreference = await AsyncStorage.getItem("defaultReminder");
          if (active && savedPreference !== null) {
            setReminder(JSON.parse(savedPreference));
          }
        }
      } catch (error) {
        console.log("Load form error:", error);
        Alert.alert("Error", "Unable to load the walk plan.");
      } finally {
        if (active) setIntializing(false);
      }
    }
    loadForm();

    return () => {
      active = false;
    };
  }, [planId, isEditing, navigation]);

  //Save a plan to Firestore
  async function handleSavePlan() {
    if (!title.trim() || !location.trim() || !date || !time) {
      Alert.alert("Missing Information", "Please fill in all fields");
      return;
    }

    // Check whether the selected date and time are in the future
    const scheduledDate = new Date(`${date}T${time}:00`);

    // Check whether the date is valid
    if (isNaN(scheduledDate.getTime())) {
      Alert.alert("Invalid Date", "Please select a valid date and time");
      return;
    }

    // Check whether the date is in the future
    if (scheduledDate <= new Date()) {
      Alert.alert("Invalid Date", "Please choose a future date and time");
      return;
    }

    // Firestore data structure stays unchanged
    const planData = {
      title: title.trim(),
      location: location.trim(),
      date,
      time: time.trim(),
      reminder,
    };
    try {
      setLoading(true);

      // Actually save or update the plan in Firestore
      if (isEditing) {
        await updateWalkPlan(planId, planData);
        console.log("Walk plan updated:", planId);
      } else {
        const newPlanId = await saveWalkPlan(planData);
        console.log("New walk plan created:", newPlanId);
      }

      // Navigate only AFTER Firestore succeeds
      if (isEditing) {
        navigation.popToTop();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error("Save plan error:", error);

      Alert.alert("Error", error.message || "Unable to save your walk plan.");
    } finally {
      setLoading(false);
    }
  }

  //AsyncStorage
  // Save the reminder setting as a simple local preference
  async function handleReminderChange(value) {
    setReminder(value);

    //Only new plans update the default preference
    if (!isEditing) {
      try {
        await AsyncStorage.setItem("defaultReminder", JSON.stringify(value));
      } catch (error) {
        console.log("AsyncStorage error:", error);
      }
    }
  }

  //UI
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={19} color="#333" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.title}>
            {isEditing ? "Edit Walk Plan" : "Plan a Walk"}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Plan Title */}
          <TextInput
            style={styles.input}
            placeholder="Plan Title"
            placeholderTextColor="#3B3B3B"
            value={title}
            onChangeText={setTitle}
          />

          {/* Location */}
          <TextInput
            style={styles.input}
            placeholder="Location"
            placeholderTextColor="#3B3B3B"
            value={location}
            onChangeText={setLocation}
          />

          {/* Date */}
          <Pressable
            style={styles.selectionRow}
            onPress={() => {
              setShowCalendar(!showCalendar);
              setShowTimePicker(false);
            }}
          >
            <Text style={styles.rowLabel}>Date</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{formatDisplayDate(date)}</Text>

              <Ionicons
                name={showCalendar ? "chevron-up" : "chevron-down"}
                size={20}
                color="#333"
              />
            </View>
          </Pressable>

          {showCalendar && (
            <View style={styles.calendarContainer}>
              <MonthCalendar
                selectedDate={date}
                onSelectDate={(selected) => {
                  setDate(selected);
                  setShowCalendar(false);
                }}
                compact
              />
            </View>
          )}

          {/* Time selection using native picker */}
          <Pressable
            style={styles.selectionRow}
            onPress={() => {
              setShowCalendar(false);
              setShowTimePicker(!showTimePicker);
            }}
          >
            <Text style={styles.rowLabel}>Time</Text>

            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{formatDisplayTime(time)}</Text>

              <Ionicons
                name={showTimePicker ? "chevron-up" : "chevron-down"}
                size={20}
                color="#333"
              />
            </View>
          </Pressable>

          {/* NEW: Native time picker */}
          {showTimePicker && (
            <View style={styles.timePickerContainer}>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                is24Hour={false} //Request 12-hour time with AM/PM
                onValueChange={handleTimeChange}
                onDismiss={handleTimeDismiss} //Handles picker cancellation
              />
            </View>
          )}

          {/* Reminder */}
          <View style={styles.selectionRow}>
            <Text style={styles.rowLabel}>Reminder</Text>
            <Switch
              value={reminder}
              onValueChange={handleReminderChange}
              disabled={initializing}
              trackColor={{
                false: "#B7B7B7",
                true: "#D4D88E",
              }}
              thumbColor="#FEFCFA"
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.createButton}
            onPress={handleSavePlan}
            disabled={loading || initializing}
          >
            <Text style={styles.buttonText}>
              {loading
                ? "SAVING ..."
                : isEditing
                  ? "Save Changes"
                  : "Create Plan"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.discardButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Discard</Text>
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
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 75,
    paddingBottom: 35,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 22,
    color: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    gap: 15,
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#CFE5FD",
    borderRadius: 6,
    padding: 15,
    fontFamily: "PawPath-Regular",
    fontSize: 14,
  },
  selectionRow: {
    backgroundColor: "#CFE5FD",
    borderRadius: 6,
    minHeight: 48,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    color: "#000",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowValue: {
    fontFamily: "PawPath-Regular",
    fontSize: 12,
    color: "#000",
  },
  calendarContainer: {
    backgroundColor: "rgba(207,229,263,0.6)",
    padding: 12,
    borderRadius: 10,
  },
  timeInput: {
    minWidth: 90,
    textAlign: "right",
    fontFamily: "PawPath-Regular",
    fontSize: 14,
    color: "#000",
  },
  // NEW: Container for native time picker
  timePickerContainer: {
    backgroundColor: "rgba(207,229,263,0.6)",
    borderRadius: 10,
    padding: 12,
  },

  // NEW: Done button for iOS
  timeDoneButton: {
    alignSelf: "flex-end",
    backgroundColor: "#D4D88E",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },

  // Done button text
  timeDoneText: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 13,
    color: "#333",
  },
  buttonContainer: {
    marginTop: "auto",
    gap: 12,
  },
  createButton: {
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  discardButton: {
    borderWidth: 2,
    borderColor: "#D4D88E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "PawPath-Medium",
    fontSize: 15,
    color: "#000",
  },
});
