import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { formatDate, parseDate } from "../utils/calendarStorage";

// Define the weekday labels
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthCalendar({
  selectedDate,
  onSelectDate,
  memories = [],
  compact = false,
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    parseDate(selectedDate || formatDate(new Date())),
  );

  useEffect(() => {
    if (selectedDate) {
      const selected = parseDate(selectedDate);

      setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [selectedDate]);

  // Get the year and month currently displayed
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  function changeMonth(amount) {
    setVisibleMonth(new Date(year, month + amount, 1));
  }

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.monthHeader}>
        <Pressable onPress={() => changeMonth(-1)}>
          <Ionicons name="chevron-back" size={20} color="#333" />
        </Pressable>

        <Text style={styles.monthTitle}>
          {visibleMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </Text>

        <Pressable onPress={() => changeMonth(1)}>
          <Ionicons name="chevron-forward" size={20} color="#333" />
        </Pressable>
      </View>

      {/*Weekday Labels  */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday) => (
          <View key={weekday} style={styles.weekCell}>
            <Text style={styles.weekText}>{weekday}</Text>
          </View>
        ))}
      </View>

      {/* Calendar date grid */}
      <View style={styles.calendarGrid}>
        {cells.map((day, index) => {
          const dateString = day
            ? formatDate(new Date(year, month, day))
            : null;

          const isSelected = dateString === selectedDate;

          // Find the first memory saved on this date
          const memory = memories.find((item) => item.date === dateString);

          return (
            <Pressable
              key={index}
              disabled={!day}
              onPress={() => onSelectDate(dateString)}
              style={[
                styles.dayCell,
                compact ? styles.compactCell : styles.regularCell,
                isSelected && styles.selectedCell,
              ]}
            >
              {day !== null && (
                <>
                  <Text style={styles.dayText}>{day}</Text>
                  {!compact && memory?.imageUri && (
                    <Image
                      source={{ uri: memory.imageUri }}
                      style={styles.memoryThumbnail}
                      resizeMode="cover"
                    />
                  )}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  monthTitle: {
    fontFamily: "PawPath-Regular",
    fontSize: 13,
    color: "#000000",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekCell: {
    width: "14.2857%",
    alignItems: "center",
  },
  weekText: {
    fontFamily: "PawPath-Regular",
    fontSize: 10,
    color: "#3B3B3B",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    // Add space around the date number
    paddingTop: 5,
    paddingLeft: 5,
    borderWidth: 0.2,
    borderColor: "rgba(59,59,59,0.3) ",
  },
  regularCell: {
    height: 75,
  },
  compactCell: {
    height: 40,
    borderWidth: 0,
  },
  selectedCell: {
    backgroundColor: "#D4D88E",
  },
  dayText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#000",
  },
  memoryThumbnail: {
    width: "100%",
    height: 45,
    borderRadius: 4,
    marginTop: 4,
    paddingBottom: 2,
    paddingRight: 5,
  },
});
