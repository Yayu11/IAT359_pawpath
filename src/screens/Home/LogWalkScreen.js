import { useState } from "react";
import { StyleSheet, Text, TextInput, View, Pressable } from "react-native";

export default function HomeScreen() {
  const [title, setTitle] = useState("");
  const [distance, setDistance] = useState("");
  const [time, setTime] = useState("");
  const [breaks, setBreaks] = useState("");
  const [behaviour, setBehaviour] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log your Activity</Text>
      <View style={styles.inputContainer}>
        {/* Title walk input */}
        <Text style={styles.inputLabel}>Title your Walk</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
        />

        {/* Distance Input */}
        <Text style={styles.inputLabel}>Distance</Text>
        <TextInput
          style={styles.input}
          placeholder="Distance"
          value={distance}
          onChangeText={setDistance}
        />

        {/* Time Input */}
        <Text style={styles.inputLabel}>Time</Text>
        <TextInput
          style={styles.input}
          placeholder="Time"
          value={time}
          onChangeText={setTime}
        />

        {/* Bathroom Break Description */}
        <Text style={styles.inputLabel}>Bathroom Breaks</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe your pet's potty habits."
          value={breaks}
          onChangeText={setBreaks}
        />

        {/* Behaviour Description */}
        <Text style={styles.inputLabel}>Behaviour</Text>
        <TextInput
          style={styles.input}
          placeholder="How was your pet's behaviour?"
          value={behaviour}
          onChangeText={setBehaviour}
        />

        <View style={styles.buttonContainer}>
          <Pressable style={styles.saveActivityButton}>
            <Text style={styles.buttonText}> Save Activity</Text>
          </Pressable>
          <Pressable
            style={styles.discardButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Discard</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontFamily: "PawPath-Bold",
    marginTop: 40,
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "PawPath-Bold",
  },
  inputContainer: {
    flexDirection: "column",
    marginBottom: 20,
    gap: 10,
  },
  input: {
    backgroundColor: "#F1F1F1",
    borderRadius: 5,
    padding: 20,
    marginRight: 10,
    color: "#000",
  },
  buttonContainer: {
    marginTop: 15,
    gap: 10,
  },
  buttonText: {
    fontFamily: "PawPath-SemiBold",
  },
  discardButton: {
    borderWidth: 2,
    borderColor: "#D4D88E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  selectAll: {
    backgroundColor: "#fff",
    borderColor: "#D4D88E",
    borderWidth: 2,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  saveActivityButton: {
    backgroundColor: "#D4D88E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
});
