import React from 'react';
import { KeyRound } from 'lucide-react';
const API = import.meta.env.VITE_API_BASE_URL;
const LoginPage = () => {
  const handleGoogleLogin = () => {
    // This simply redirects the user to our backend's Google auth route
    window.location.href = '${import.meta.env.VITE_API_BASE_URL}/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-xl text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to DocuMentor</h1>
        <p className="text-gray-600 mb-6">Sign in to get started.</p>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
        >
          <KeyRound size={20} />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default LoginPage;