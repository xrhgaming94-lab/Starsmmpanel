import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "@firebase/auth";

// Your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBfqC41BDQyJEplfIadQ9LvhXNygjsEqIQ",
  authDomain: "emote-80757.firebaseapp.com",
  databaseURL: "https://emote-80757-default-rtdb.firebaseio.com",
  projectId: "emote-80757",
  storageBucket: "emote-80757.appspot.com",
  messagingSenderId: "204085368608",
  appId: "1:204085368608:web:cbb295cfbc21eebf7e2945",
  measurementId: "G-EN0C34ENWZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
// experimentalForceLongPolling helps in some restricted network environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Export the Firebase Storage instance
export const storage = getStorage(app);
// Export the Firebase Auth instance
export const auth = getAuth(app);