// src/hooks/useFirebaseUser.js
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, browserSessionPersistence, setPersistence } from "firebase/auth";

export default function useFirebaseUser() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        console.log("✅ Firebase set to session persistence");
      })
      .catch((error) => {
        console.error("🔥 Error setting persistence:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return { user, authReady };
}
