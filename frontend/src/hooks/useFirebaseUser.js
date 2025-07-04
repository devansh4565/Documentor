import { useState, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const useFirebaseUser = () => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // When auth state changes, update the user object
      setUser(firebaseUser);
      // Mark auth as ready only after the first check has completed
      if (!authReady) {
        setAuthReady(true);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  /**
   * A memoized, safe function to get the ID token.
   * It will only return a token if the user is authenticated.
   * Returns null otherwise.
   */
  const getIdToken = useCallback(async () => {
    // THE CRITICAL FIX IS HERE:
    // We get the *current* user directly from the auth instance
    // instead of relying on the `user` state, which can be stale
    // inside a callback.
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        // This is guaranteed to be a function if currentUser exists.
        return await currentUser.getIdToken(true); // `true` forces a refresh if needed
      } catch (error) {
        console.error("Error getting ID token:", error);
        return null;
      }
    }
    // If there's no current user, return null.
    return null;
  }, []); // This function never needs to change, so its dependency array is empty.

  return { user, authReady, getIdToken };
};

export default useFirebaseUser;