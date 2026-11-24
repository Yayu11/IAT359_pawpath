// the same photo retrieval code in all three screens

import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { httpsCallable } from "firebase/functions";

import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";

import { firebase_functions } from "../firebaseConfig";

export default function PlacePhoto({ place, style, enabled = true }) {
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const photoName = place?.photoName;
  const isTrail = place?.type === "Trail";

  // Retrieve the actual photo URL
  useEffect(() => {
    let active = true;

    setPhotoUri(null);
    setLoading(false);

    // Do not request an image if no photo is available
    // or photo loading is disabled
    if (!photoName || !enabled) {
      return;
    }

    async function loadPhoto() {
      try {
        setLoading(true);

        const getPlacePhoto = httpsCallable(
          firebase_functions,
          "getPlacePhoto",
        );

        const result = await getPlacePhoto({
          photoName,
        });

        if (active) {
          setPhotoUri(result.data?.photoUri ?? null);
        }
      } catch (error) {
        console.log("Place photo error:", photoName, error.code, error.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPhoto();

    return () => {
      active = false;
    };
  }, [photoName, enabled]);

  // Open photo author or Google Maps source
  async function openLink(uri) {
    if (!uri || !uri.startsWith("https://")) return;

    try {
      await Linking.openURL(uri);
    } catch (error) {
      console.log("Unable to open attribution link", error);
    }
  }

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color="#8F9E42" />
        </View>
      ) : photoUri && enabled ? (
        <>
          <Image
            source={{ uri: photoUri }}
            style={styles.image}
            resizeMode="cover"
            onError={(event) => {
              console.log("Image rendering error:", event.nativeEvent.error);

              setPhotoUri(null);
            }}
          />

          {/* Open image and author attribution */}
          <Pressable
            style={styles.creditButton}
            onPress={() => setShowCredits(true)}
            accessibilityLabel="View photo and credits"
          >
            <Ionicons
              name="information-circle-outline"
              size={15}
              color="#FFFFFF"
            />
          </Pressable>
        </>
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              backgroundColor: isTrail ? "#F6DEBF" : "#E8EEDB",
            },
          ]}
        >
          <Ionicons
            name={isTrail ? "footsteps-outline" : "leaf-outline"}
            size={28}
            color={isTrail ? "#D88B45" : "#8F9E42"}
          />
        </View>
      )}

      {/* Full photo and credits */}
      <Modal
        visible={showCredits}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCredits(false)}
      >
        <View style={styles.modalBackground}>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ padding: 16 }}
          >
            <Pressable
              onPress={() => setShowCredits(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} />
            </Pressable>

            <Text style={styles.title}>{place.name}</Text>

            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                style={styles.largeImage}
                resizeMode="contain"
              />
            )}

            <Text style={styles.creditText}>Google Maps</Text>

            {(place.photoAttributions ?? []).map((author, index) => (
              <Pressable
                key={index}
                style={styles.authorRow}
                onPress={() => openLink(author.uri)}
                disabled={!author.uri}
              >
                {author.photoUri && (
                  <Image
                    source={{ uri: author.photoUri }}
                    style={styles.avatar}
                  />
                )}

                <Text style={styles.creditText}>
                  Photo by {author.displayName}
                </Text>
              </Pressable>
            ))}

            {place.photoGoogleMapsUri && (
              <Pressable onPress={() => openLink(place.photoGoogleMapsUri)}>
                <Text style={styles.linkText}>
                  View original photo on Google Maps
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#E8EEDB",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  placeholder: {
    flex: 1,
    backgroundColor: "#E8EEDB",
    justifyContent: "center",
    alignItems: "center",
  },

  creditButton: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 5,
    padding: 4,
  },

  modalBackground: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
  },

  modalContent: {
    flexGrow: 0,
    maxHeight: "85%",
    backgroundColor: "#FEFCFA",
    borderRadius: 15,
  },

  closeButton: {
    alignSelf: "flex-end",
  },

  title: {
    fontFamily: "PawPath-SemiBold",
    fontSize: 16,
    marginBottom: 12,
  },

  largeImage: {
    width: "100%",
    height: 250,
    borderRadius: 8,
  },

  creditText: {
    fontFamily: "PawPath-Regular",
    fontSize: 11,
    color: "#444",
    marginVertical: 5,
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  avatar: {
    width: 25,
    height: 25,
    borderRadius: 13,
  },

  linkText: {
    fontFamily: "PawPath-Medium",
    fontSize: 11,
    color: "#52752D",
    textDecorationLine: "underline",
    marginTop: 10,
  },
});
