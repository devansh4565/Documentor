import React from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const navigate = useNavigate();
    const auth = getAuth();

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // On successful login, Firebase's onAuthStateChanged listener
            // in App.js will handle redirection automatically.
            navigate('/workarea'); // Or let the ProtectedRoute handle it
        } catch (error) {
            console.error("Login failed:", error);
            alert(`Login failed: ${error.message}`);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="p-10 bg-white rounded-lg shadow-xl text-center">
                <h1 className="text-3xl font-bold mb-2">Welcome to Documentor</h1>
                <p className="text-gray-600 mb-6">Your intelligent document assistant.</p>
                <button
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                >
                    <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M24 9.5c3.9 0 6.9 1.6 9.1 3.7l6.9-6.9C35.2 2.5 30.1 0 24 0 14.8 0 7.2 5.3 4.4 12.6l8.3 6.5C14.1 13.4 18.6 9.5 24 9.5z"></path>
                        <path fill="#34A853" d="M46.2 25.4c0-1.7-.2-3.3-.5-4.9H24v9.4h12.4c-.5 3.1-2.9 5.7-5.9 7.5l7.9 6.1c4.6-4.2 7.3-10.4 7.3-18.1z"></path>
                        <path fill="#FBBC05" d="M14.1 28.5c-.7-2.1-.7-4.4 0-6.5l-8.3-6.5C2.9 19.4 1.2 24.5 1.2 30c0 5.5 1.7 10.6 4.6 14.5l8.3-6.5c-1.3-3.8-1.3-8.2 0-12z"></path>
                        <path fill="#EA4335" d="M24 48c6.1 0 11.2-2 14.9-5.4l-7.9-6.1c-2 1.3-4.5 2.1-7 2.1-5.4 0-9.9-3.9-11.5-9.2L4.4 37.4C7.2 44.7 14.8 48 24 48z"></path>
                    </svg>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export default LoginPage;