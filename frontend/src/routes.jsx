import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Import hooks and components
import useFirebaseUser from './hooks/useFirebaseUser';
import WorkArea from './components/WorkArea';
import MindMap from './components/MindMap';
import LoginPage from './components/LoginPage';
import UploadSection from './components/UploadSection';

// --- Helper Components (can be in this file or imported) ---
const LoadingSpinner = () => (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const ProtectedRouteLayout = () => {
    const { user, authReady } = useFirebaseUser();
    if (!authReady) return <LoadingSpinner />;
    return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// --- Route Configuration Object ---
export const getRoutes = (initialSessions, setInitialSessions) => [
    {
        // Public routes
        path: '/',
        element: <Outlet />, // A parent for public routes
        children: [
            { index: true, element: <UploadSection /> }, // The default route
            { path: 'login', element: <LoginPage /> },
        ]
    },
    {
        // Protected routes
        path: '/',
        element: <ProtectedRouteLayout />, // The gatekeeper layout
        children: [
            {
                path: 'workarea',
                element: (
                    <WorkArea
                        initialSessions={initialSessions}
                        setInitialSessions={setInitialSessions}
                    />
                )
            },
            { path: 'mindmap', element: <MindMap /> },
        ]
    },
    // Catch-all redirect
    { path: '*', element: <Navigate to="/" replace /> }
];