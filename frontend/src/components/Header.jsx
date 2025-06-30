// --- FILE: frontend/src/components/Header.jsx ---

import React, { useState } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_BASE_URL;

const Header = ({ user }) => {
    const [imgError, setImgError] = useState(false);
    
    const handleLogout = async () => {
        try {
            // This POST request clears the session on the backend
            await axios.post('${import.meta.env.VITE_API_BASE_URL}/api/auth/logout', {}, { withCredentials: true });
            
            // This forces a reload. The App component will then see the user is gone and redirect to /login
            window.location.href = '/login'; 
        } catch (err) {
            console.error("Logout failed:", err);
            // Even if backend fails, force a redirect
            window.location.href = '/login'; 
        }
    };

    if (!user) return null; // Should not happen in a protected route, but good practice
    const initials = user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || '';

    return (
        <div className="w-full flex-shrink-0 bg-white dark:bg-gray-800 p-3 shadow-md flex justify-between items-center border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
                {!imgError ? (
                    <img 
                        src={user.profilePicture} 
                        alt="profile" 
                        className="w-8 h-8 rounded-full"
                        // ✅ This runs if the image fails to load (like with a 429 error)
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                        {initials}
                    </div>
                )}
                
                <span className="font-semibold text-sm">Welcome, {user.displayName}</span>
            </div>
            <button 
                onClick={handleLogout} 
                className="bg-red-500 text-white px-3 py-1.5 text-sm rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
                Logout
            </button>
        </div>
    );
};

export default Header;