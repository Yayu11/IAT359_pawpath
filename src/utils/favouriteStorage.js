import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  serverTimestamp, // Record when a favourite was saved
} from "firebase/firestore";

import { db, firebase_auth, firebase_functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";

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
  if (!place?.id || !place?.name) {
    throw new Error("Place ID and name are required.");
  }

  const reference = doc(favouritesCollection(), String(place.id));

  // Store the place reference rather than  permanently storing Google Places content.
  const favouriteData = {
    source: place.source ?? "google",
    savedAt: serverTimestamp(),
  };
  await setDoc(reference, favouriteData);

  console.log("Favourite saved:", place.id);
}

// --------------------------------------------------
// READ: Retrieve all saved places
export async function getFavourites() {
  const snapshot = await getDocs(favouritesCollection());

  return snapshot.docs.map((item) => ({
    id: item.id,
    source: item.data().source ?? "google",
  }));
}

// --------------------------------------------------
// Retrieve complete information for one saved place
export async function getFavouriteDetails(placeId) {
  const getSavedPlaceDetails = httpsCallable(
    firebase_functions,
    "getSavedPlaceDetails",
  );

  const result = await getSavedPlaceDetails({
    placeId,
  });

  return result.data?.place ?? null;
}

// --------------------------------------------------
// Calculate straight-line distance in kilometres
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Validate all GPS coordinates
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return null;
  }

  const earthRadius = 6371;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lon2 - lon1);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  const c = 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));

  return earthRadius * c;
}

// --------------------------------------------------
// Add distance from the current search area
function addPlaceDistance(place, searchCenter) {
  const distanceKm = calculateDistance(
    searchCenter?.latitude,
    searchCenter?.longitude,
    place.latitude,
    place.longitude,
  );

  return {
    ...place,

    distanceKm: distanceKm,
  };
}

// --------------------------------------------------
// Retrieve full saved place information
export async function getFavouritesWithDetails(
  nearbyPlaces = [],
  searchCenter = null,
) {
  const favourites = await getFavourites();

  const results = await Promise.all(
    favourites.map(async (item) => {
      try {
        // Check whether the saved place is already
        // available in the current nearby search results.
        const existingPlace = nearbyPlaces.find(
          (place) => place.id === item.id,
        );

        // Reuse existing information to avoid
        // unnecessary Google Places API requests.
        if (existingPlace) {
          return addPlaceDistance(existingPlace, searchCenter);
        }

        // Otherwise, retrieve current information
        // from Google Places through Firebase.
        const place = await getFavouriteDetails(item.id);

        if (!place?.id) {
          throw new Error("Place information unavailable.");
        }

        // Preserve the Firestore document ID
        // and calculate the current distance.
        return addPlaceDistance(
          {
            ...place,
            id: item.id,
          },
          searchCenter,
        );
      } catch (error) {
        console.log("Saved place details error:", error.code, error.message);

        // Keep unavailable places in the list
        // so users can still remove them.
        return {
          id: item.id,
          name: "Place information unavailable",
          source: item.source,
          detailsUnavailable: true,
          distanceKm: null,
        };
      }
    }),
  );

  return results;
}

// --------------------------------------------------
// DELETE: Remove a saved place
export async function removeFavourite(placeId) {
  const reference = doc(favouritesCollection(), String(placeId));

  await deleteDoc(reference);

  console.log("Favourite removed:", placeId);
}
