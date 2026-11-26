// /**
//  * Import function triggers from their respective submodules:
//  *
//  * const {onCall} = require("firebase-functions/v2/https");
//  * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */

// const {setGlobalOptions} = require("firebase-functions");
// const {onRequest} = require("firebase-functions/https");
// const logger = require("firebase-functions/logger");

// // For cost control, you can set the maximum number of containers that can be
// // running at the same time. This helps mitigate the impact of unexpected
// // traffic spikes by instead downgrading performance. This limit is a
// // per-function limit. You can override the limit for each function using the
// // `maxInstances` option in the function's options, e.g.
// // `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// // NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// // functions should each use functions.runWith({ maxInstances: 10 }) instead.
// // In the v1 API, each function can only serve one request per container, so
// // this will be the maximum concurrent request count.
// setGlobalOptions({ maxInstances: 10 });

// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started

// // exports.helloWorld = onRequest((request, response) => {
// //   logger.info("Hello logs!", {structuredData: true});
// //   response.send("Hello from Firebase!");
// // });

const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// Limit the number of running function instances
setGlobalOptions({
  maxInstances: 1,
  region: "us-central1",
});

// Read the API key stored in Firebase Secret Manager
const googlePlacesKey = defineSecret("GOOGLE_PLACES_KEY");

// Shared configuration for all Google Places functions
const functionOptions = {
  secrets: [googlePlacesKey],
  maxInstances: 1,
  concurrency: 1,
  timeoutSeconds: 30,
};

// PlaceFields required by PlaceImage (image)
const placeFields = [
  "id",
  "displayName",
  "location",
  "types",
  "primaryType",
  "photos",
  "attributions",
];

// ------------------------------------------------
// Check whether the user is authenticated
function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
}

// ------------------------------------------------
//  Convert Google Places data into PawPath data
function formatPlace(place) {
  const types = place.types || [];

  // Identify hiking areas as trails
  const isTrail =
    place.primaryType === "hiking_area" || types.includes("hiking_area");

  // Retrieve only the first available photo reference
  const photo = place.photos?.[0];

  return {
    id: place.id,
    name: place.displayName?.text || "Unnamed Place",

    // Assign different types to parks and trails
    type: isTrail ? "Trail" : "Park",

    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,

    source: "google",

    // Photo resource name, not the actual image URL
    photoName: photo?.name ?? null,

    // Required credits for the photo
    photoAttributions: photo?.authorAttributions ?? [],
    photoGoogleMapsUri: photo?.googleMapsUri ?? null,

    // Additional third-party attributions
    attributions: place.attributions ?? [],
  };
}

// ------------------------------------------------
//Reusable function for Google API responses
async function readGoogleResponse(response) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    logger.error("Google Places request failed", {
      status: response.status,
      googleErrorCode: errorBody?.error?.code,
      googleErrorStatus: errorBody?.error?.status,
      googleErrorMessage: errorBody?.error?.message,
    });

    throw new HttpsError("internal", "Unable to retrieve Google Places data.");
  }

  return response.json();
}

// ------------------------------------------------
// Function Retrieve nearby parks AND trails
exports.getNearbyParks = onCall(functionOptions, async (request) => {
  requireAuth(request);

  const { latitude, longitude } = request.data || {};

  // Validate coordinates
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new HttpsError("invalid-argument", "Invalid latitude or longitude.");
  }

  const url = "https://places.googleapis.com/v1/places:searchNearby";

  // ------------------------------------------------
  // Shared helper for each category search
  async function searchNearby(includedTypes, maxResultCount) {
    const requestBody = {
      includedTypes,
      maxResultCount,
      rankPreference: "DISTANCE",

      locationRestriction: {
        circle: {
          center: {
            latitude,
            longitude,
          },
          radius: 3000,
        },
      },
    };

    // Send the HTTP request using fetch()
    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        "X-Goog-Api-Key": googlePlacesKey.value(),

        "X-Goog-FieldMask": placeFields
          .map((field) => `places.${field}`)
          .join(","),
      },

      body: JSON.stringify(requestBody),
    });

    const data = await readGoogleResponse(response);

    return data.places || [];
  }

  try {
    // Search for parks and trails separately
    const [parkResults, trailResults] = await Promise.all([
      searchNearby(["park", "dog_park", "city_park", "national_park"], 10),

      searchNearby(["hiking_area"], 10),
    ]);

    //  Combine both sets of results
    const combinedResults = [...parkResults, ...trailResults];

    // Remove duplicate places using their IDs
    const uniquePlaces = [
      ...new Map(combinedResults.map((place) => [place.id, place])).values(),
    ];

    // Convert Google results into PawPath objects
    const places = uniquePlaces
      .map(formatPlace)
      .filter(
        (place) =>
          place.id &&
          Number.isFinite(place.latitude) &&
          Number.isFinite(place.longitude),
      );

    // Log the results for testing
    logger.info("Nearby places retrieved", {
      total: places.length,

      parks: places.filter((place) => place.type === "Park").length,

      trails: places.filter((place) => place.type === "Trail").length,

      // Check photo availability
      withPhotos: places.filter((place) => Boolean(place.photoName)).length,

      withoutPhotos: places.filter((place) => !place.photoName).length,
    });

    return { places };
  } catch (error) {
    logger.error("Error retrieving nearby places", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Unable to retrieve nearby places.");
  }
});

// ------------------------------------------------
// Retrieve an actual place photo URL
exports.getPlacePhoto = onCall(functionOptions, async (request) => {
  requireAuth(request);

  const { photoName } = request.data || {}; // receive photo name

  // Validate Google photo resource name
  if (
    typeof photoName !== "string" ||
    photoName.length > 4096 ||
    !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photoName)
  ) {
    throw new HttpsError("invalid-argument", "Invalid photo resource name.");
  }

  // Small image suitable for PawPath cards
  const url =
    `https://places.googleapis.com/v1/${photoName}/media` +
    "?maxWidthPx=400" +
    "&skipHttpRedirect=true";

  try {
    //Reterieve the photo URL
    const response = await fetch(url, {
      method: "GET",

      headers: {
        "X-Goog-Api-Key": googlePlacesKey.value(),
      },
    });

    const data = await readGoogleResponse(response);

    // Return temporary image URL without exposing API key
    return {
      photoUri: data.photoUri ?? null,
    };
  } catch (error) {
    logger.error("Unable to retrieve place photo", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Unable to retrieve place photo.");
  }
});

// Additional fields for DetailPlaceScreen only
const detailPlaceFields = [
  "formattedAddress",
  "regularOpeningHours",
  "allowsDogs",
  "editorialSummary",
  "attributions",
];

// ------------------------------------------------
//Retrieve current information for a saved place
exports.getSavedPlaceDetails = onCall(functionOptions, async (request) => {
  requireAuth(request);

  const { placeId } = request.data || {};

  if (
    typeof placeId !== "string" ||
    placeId.length > 1024 ||
    !/^[A-Za-z0-9_-]+$/.test(placeId)
  ) {
    throw new HttpsError("invalid-argument", "Invalid Google Place ID.");
  }

  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  try {
    const response = await fetch(url, {
      method: "GET",

      headers: {
        "X-Goog-Api-Key": googlePlacesKey.value(),

        "X-Goog-FieldMask": placeFields.join(","),
      },
    });

    const data = await readGoogleResponse(response);

    return {
      place: formatPlace(data),
    };
  } catch (error) {
    logger.error("Unable to retrieve saved place", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Unable to retrieve saved place.");
  }
});

// ------------------------------------------------
// Retrieve additional information for DetailPlaceScreen
exports.getPlaceDetails = onCall(functionOptions, async (request) => {
  requireAuth(request);

  const { placeId } = request.data || {};

  // Validate Google Place ID
  if (
    typeof placeId !== "string" ||
    placeId.length > 1024 ||
    !/^[A-Za-z0-9_-]+$/.test(placeId)
  ) {
    throw new HttpsError("invalid-argument", "Invalid Google Place ID.");
  }

  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  try {
    const response = await fetch(url, {
      method: "GET",

      headers: {
        "X-Goog-Api-Key": googlePlacesKey.value(),

        // Request additional information only
        "X-Goog-FieldMask": detailPlaceFields.join(","),
      },
    });

    const data = await readGoogleResponse(response);

    // Convert Google Places data into PawPath properties
    const details = {
      address: data.formattedAddress ?? null,

      openingHours: data.regularOpeningHours?.weekdayDescriptions ?? [],

      allowsDogs: data.allowsDogs ?? null,

      description: data.editorialSummary?.text ?? null,

      attributions: data.attributions ?? [],
    };

    // Temporary testing log
    logger.info("Place details retrieved", {
      placeId,
      ...details,
    });

    return {
      details,
    };
  } catch (error) {
    logger.error("Unable to retrieve place details", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      "Unable to retrieve additional place information.",
    );
  }
});
