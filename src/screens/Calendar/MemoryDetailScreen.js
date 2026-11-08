import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  formatDisplayDate,
  getMemoriesByDate,
  deleteMemory,
} from "../../utils/calendarStorage";

export default function MemoryDetailScreen({ navigation, route }) {
  const { date } = route.params;

  const [memories, setMemories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState(null);

  // Reload memories when returning from CreateMemoryScreen
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadMemories() {
        try {
          setLoading(true);

          const result = await getMemoriesByDate(date);

          if (!active) return;

          setMemories(result);

          setCurrentIndex((previous) => {
            if (result.length === 0) return 0;

            // Keep the edited memory selected if it still exists
            if (selectedMemoryId) {
              const index = result.findIndex(
                (item) => item.id === selectedMemoryId,
              );

              if (index !== -1) return index;
            }

            // Find the index of the last available memory
            const lastIndex = result.length - 1;

            // If the previous index is too large, move to the last available memory
            if (previous > lastIndex) {
              return lastIndex;
            }

            // Otherwise, keep the previously selected memory index
            return previous;
          });
        } catch (error) {
          console.log("Memory error:", error);

          if (active) {
            Alert.alert("Error", error.message || "Unable to load memories.");
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadMemories();

      return () => {
        active = false;
      };
    }, [date, selectedMemoryId]),
  );

  function changeMemory(amount) {
    setCurrentIndex((previous) => {
      const newIndex = previous + amount;

      // Prevent going before the first memory
      if (newIndex < 0) {
        return 0;
      }

      // Prevent going beyond the last memory
      if (newIndex >= memories.length) {
        return memories.length - 1;
      }

      // Otherwise, use the new index
      return newIndex;
    });

    setSelectedMemoryId(null);
  }

  const memory = memories[currentIndex];

  //Navigate to editing mode
  function handleEditMemory() {
    if (!memory || deleting) return;

    navigation.navigate("CreateMemory", { memoryId: memory.id });
  }

  //Ask for confirmation before deleting
  function handleDeleteMemory() {
    if (!memory || deleting) return;
    Alert.alert(
      "Delete Memory",
      "Are you sure you want to delete this memory",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDeleteMemory(memory.id),
        },
      ],
    );
  }

  // Delete the selected memory from Firestore
  async function confirmDeleteMemory(memoryId) {
    try {
      setDeleting(true);

      //Delete memory from Firestore
      await deleteMemory(memoryId);

      //Remove the deleted memory from current UI
      const updateMemories = memories.filter((item) => item.id !== memoryId);
      setMemories(updateMemories);

      // Adjust the selected index
      setCurrentIndex((previous) =>
        Math.max(0, Math.min(previous, updateMemories.length - 1)),
      );

      // Close the detail screen if no memories remain
      if (updateMemories.length === 0) {
        navigation.goBack();
      }
    } catch (error) {
      console.error("Delete memory error:", error);

      Alert.alert("Error", error.message || "Unable to delete the memory.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator size="large" color="#D4D88E" />
      ) : !memory ? (
        <View style={styles.memoryCard}>
          <Text style={styles.emptyText}>No memories found.</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.memoryCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.dateHeader}>
              <Pressable
                disabled={currentIndex === 0}
                onPress={() => changeMemory(-1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={23}
                  color={currentIndex === 0 ? "#CCC" : "#333"}
                />
              </Pressable>

              <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>

              <Pressable
                disabled={currentIndex === memories.length - 1 || deleting}
                onPress={() => changeMemory(1)}
              >
                <Ionicons
                  name="chevron-forward"
                  size={23}
                  color={currentIndex === memories.length - 1 ? "#CCC" : "#333"}
                />
              </Pressable>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={20} color="#333" />

              <Text style={styles.locationText}>{memory.location}</Text>
            </View>

            <Image
              source={{ uri: memory.imageUri }}
              style={styles.memoryImage}
              resizeMode="cover"
            />

            <Text style={styles.caption}>{memory.caption}</Text>

            <View style={styles.pagination}>
              {memories.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
            <View style={styles.actionButtons}>
              <Pressable
                style={styles.editButton}
                onPress={handleEditMemory}
                disabled={deleting}
              >
                <Ionicons name="create-outline" size={18} color="#333" />
                <Text style={styles.actionText}>Edit Memory</Text>
              </Pressable>

              <Pressable
                style={styles.deleteButton}
                onPress={handleDeleteMemory}
                disabled={deleting}
              >
                <Ionicons name="trash-outline" size={18} color="#B94343" />
                <Text style={styles.deleteText}>
                  {deleting ? "Deleting..." : "Delete Memory"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  memoryCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#FEFCFA",
    borderRadius: 18,
    padding: 25,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    marginBottom: 30,
  },
  dateText: {
    fontFamily: "PawPath-Medium",
    fontSize: 14,
    color: "#333",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 15,
  },
  locationText: {
    fontFamily: "PawPath-Regular",
    fontSize: 16,
  },
  memoryImage: {
    width: "100%",
    height: 340,
    borderRadius: 10,
  },
  caption: {
    fontFamily: "PawPath-Regular",
    fontSize: 15,
    marginTop: 12,
    marginBottom: 45,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginBottom: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#DDD",
  },
  activeDot: {
    backgroundColor: "#D4D88E",
  },
  emptyText: {
    fontFamily: "PawPath-Regular",
    fontSize: 15,
    textAlign: "center",
  },
  closeText: {
    fontFamily: "PawPath-SemiBold",
    color: "#8F9E42",
    textAlign: "center",
    marginTop: 20,
  },
  // Container for Edit and Delete buttons
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 25,
  },

  // Edit button
  editButton: {
    flex: 1,
    backgroundColor: "#D4D88E",
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  // Delete button
  deleteButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#B94343",
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  // Edit button text
  actionText: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#333",
  },

  // Delete button text
  deleteText: {
    fontFamily: "PawPath-Medium",
    fontSize: 12,
    color: "#B94343",
  },
});
