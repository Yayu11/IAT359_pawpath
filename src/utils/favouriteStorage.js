import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { db, firebase_auth } from "../firebaseConfig";

// Return the signed-in user's UID
function getUserId() {
  const user = firebase_auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user.uid;
}

// Collection for the signed-in user's favourite places
function favouritesCollection() {
  return collection(db, "users", getUserId(), "favouritePlaces");
}

// CREATE: Save a place to Firestore
export async function saveFavourite(place) {
  const reference = doc(favouritesCollection(), place.id);

  await setDoc(reference, {
    name: place.name,
    type: place.type,
    walkDistance: place.walkDistance,
    difficulty: place.difficulty,
  });

  console.log("Favourite saved:", place.id);
}

// READ: Retrieve all saved places
export async function getFavourites() {
  const snapshot = await getDocs(favouritesCollection());

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

// DELETE: Remove a saved place
export async function removeFavourite(placeId) {
  const reference = doc(favouritesCollection(), placeId);

  await deleteDoc(reference);

  console.log("Favourite removed:", placeId);
}
