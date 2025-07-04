// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration is read from secure environment variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase Authentication
// This is the missing piece that WorkArea needs.
export const auth = getAuth(app);

// Optional: Initialize Analytics
const analytics = getAnalytics(app);

// Set auth persistence (optional but good practice)
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log("Firebase auth persistence set to session.");
  })
  .catch((error) => {
    console.error("Firebase auth persistence error:", error);
  });

export default app;