import {
  addDoc,
  collection, // references a Firestore collection
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db, firebase_auth } from "../firebaseConfig";

//Return the current authenticated user's UID
function getUserId() {
  const user = firebase_auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user.uid;
}

// Stores dates as YYYY-MM-DD
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

//Aviod timezone shifts when reading  YYY-MM-DD
export function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDisplayDate(dateString) {
  return parseDate(dateString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ------------------Walk Plan Data Storage-------------------------
//Walk plan collection for the signed-in user
function walkPlansCollection() {
  return collection(db, "users", getUserId(), "walkPlans");
}

//CREATE: add a walk plan
export async function saveWalkPlan(plan) {
  const result = await addDoc(walkPlansCollection(), plan);

  //Can remove console later
  console.log("Saved walk plan ID:", result.id);

  return result.id;
}

//READ: Retrieve all walk plans
export async function getWalkPlans() {
  const snapshot = await getDocs(walkPlansCollection());

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

//Retrieve ONE walk plan by ID
export async function getWalkPlanById(planId) {
  const reference = doc(walkPlansCollection(), planId);
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

//UPDATE: Edit an existing walk plan
export async function updateWalkPlan(planId, changes) {
  const reference = doc(walkPlansCollection(), planId);
  await updateDoc(reference, changes);
}

// DELETE: Remove a WalkPlan
export async function deleteWalkPlan(planId) {
  const reference = doc(walkPlansCollection(), planId);
  await deleteDoc(reference);
}

// ------------------- Memories ------------------------------------
//Memory collection for the signed-in user
function memoriesCollection() {
  return collection(db, "users", getUserId(), "memories");
}

//CREATE: ADD A MEMORY
export async function saveMemory(memory) {
  const result = await addDoc(memoriesCollection(), memory);
  return result.id;
}

// READ: Retrieve all memories
export async function getMemories() {
  const snapshot = await getDocs(memoriesCollection());

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

//READ: Retrieve memories for a specific date
export async function getMemoriesByDate(date) {
  const memoryQuery = query(memoriesCollection(), where("date", "==", date));

  const snapshot = await getDocs(memoryQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

// RETRIEVE one Memory by ID
export async function getMemoryById(memoryId) {
  const reference = doc(memoriesCollection(), memoryId);
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

//UPDATE an existing memory
export async function updateMemory(memoryId, changes) {
  const reference = doc(memoriesCollection(), memoryId);
  await updateDoc(reference, changes);
}

// Delete a saved memory
export async function deleteMemory(memoryId) {
  const reference = doc(memoriesCollection(), memoryId);

  await deleteDoc(reference);
}
