import React from "react";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const LoginButton = () => {
  const handleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Firebase login success:", result.user);
    } catch (error) {
      console.error("❌ Firebase login failed:", error);
    }
  };

  return <button onClick={handleLogin}>🔥 Login with Google (Firebase)</button>;
};

export default LoginButton;
