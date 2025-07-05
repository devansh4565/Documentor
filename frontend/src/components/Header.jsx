import React from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase'; // ✅ IMPORT the initialized auth instance

const Header = ({ user }) => { // Assume user object is passed as a prop
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            // After sign out, redirect to the login page.
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b dark:border-gray-700">
            <h1 className="text-xl font-bold">Documentor</h1>
            <div className="flex items-center gap-4">
                {user && (
                    <span className="text-sm font-medium hidden sm:inline">{user.email}</span>
                )}
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-colors"
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

export default Header;