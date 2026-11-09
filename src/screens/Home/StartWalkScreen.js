import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  Image,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { firebase_auth } from "../../firebaseConfig";
import { initializeProfileDB, getPets } from "../../utils/profileDB";

export default function SelectPetScreen({ navigation }) {}
