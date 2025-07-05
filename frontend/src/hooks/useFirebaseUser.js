import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase'; // ✅ IMPORT the initialized auth service

const useFirebaseUser = () => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] =useState(false);

  useEffect(() => {
    // The `auth` object is now imported directly.
    // We no longer need to call getAuth() here.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []); // The empty dependency array is correct.

  const getIdToken = useCallback(async () => {
    // The imported `auth` object gives us access to currentUser.
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken(true);
    }
    return null;
  }, []);

  return { user, authReady, getIdToken };
};

export default useFirebaseUser;