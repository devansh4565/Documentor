import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration read from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --- THIS IS THE FIX ---

// 1. Initialize Firebase ONCE and only once in this file.
const app = initializeApp(firebaseConfig);

// 2. Get the auth service from the initialized app.
const auth = getAuth(app);

// 3. Export the initialized auth service directly.
export { auth };

// You can also export the app instance if other services need it.
export default app;