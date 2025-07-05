import React from "react";
// We only need signInWithPopup and GoogleAuthProvider from here now
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"; 
import { auth } from '../firebase'; // ✅ IMPORT the central, initialized auth instance

const LoginButton = () => {
  const handleLogin = async () => {
    // ❌ REMOVE this line: const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      // Use the imported `auth` instance directly.
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Firebase login success:", result.user);
      // NOTE: You will likely want to add a `navigate('/workarea')` here
      // if this button is part of your LoginPage.
    } catch (error) {
      console.error("❌ Firebase login failed:", error);
    }
  };

  return (
      <button 
        onClick={handleLogin}
        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
      >
        🔥 Login with Google (Firebase)
      </button>
  );
};

export default LoginButton;