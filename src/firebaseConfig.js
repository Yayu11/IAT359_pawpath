// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import "firebase/firestore";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVtTqcUOALYTegOolwB-8G00_9wGq-bh4",
  authDomain: "storing-data-in-firestor-1670c.firebaseapp.com",
  projectId: "storing-data-in-firestor-1670c",
  storageBucket: "storing-data-in-firestor-1670c.firebasestorage.app",
  messagingSenderId: "49606414550",
  appId: "1:49606414550:web:94f88cbaf7d4a1a923f977",
  measurementId: "G-443H93SWY0",
};

// Initialize Firebase
export const firebase_app = initializeApp(firebaseConfig);
// get the firestore database object
export const db = getFirestore(firebase_app);
