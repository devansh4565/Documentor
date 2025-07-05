import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useFirebaseUser from '../hooks/useFirebaseUser';

/**
 * A simple loading spinner to show while checking authentication.
 */
const LoadingSpinner = () => (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

/**
 * A layout component that protects all its child routes.
 * It checks the user's authentication status and either renders the
 * requested child route via `<Outlet />` or redirects to the login page.
 */
const ProtectedRoute = () => {
    const { user, authReady } = useFirebaseUser();

    // Show a spinner while Firebase is initializing
    if (!authReady) {
        return <LoadingSpinner />;
    }

    // If authentication is ready and a user exists, render the child route.
    // If not, redirect to the login page.
    return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;