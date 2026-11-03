import { initializeApp } from "firebase/app";
// import Firebase Authentication functionality into your project.
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGbSjwTXlX1Cv7Ic0_J2kB6LS-t4YdpZM",
  authDomain: "fir-demo-dfac5.firebaseapp.com",
  projectId: "fir-demo-dfac5",
  storageBucket: "fir-demo-dfac5.firebasestorage.app",
  messagingSenderId: "472927261359",
  appId: "1:472927261359:web:221f02c2eb0a81a6d33a5a",
  measurementId: "G-5EPLM3REDF",
};

export const firebase_app = initializeApp(firebaseConfig);
// Exports the Firebase Authentication instance to be used in other parts of your project.
export const firebase_auth = getAuth(firebase_app);
// Initialize Firestore
export const db = getFirestore(firebase_app);
