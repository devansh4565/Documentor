import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// --- CONTEXT & HOOKS ---
import { ThemeProvider } from './context/ThemeContext';
import useFirebaseUser from './hooks/useFirebaseUser'; 

// --- PAGE & LAYOUT COMPONENTS ---
import WorkArea from './components/WorkArea';
import MindMap from './components/MindMap';
import LoginPage from "./components/LoginPage";
import UploadSection from './components/UploadSection';

// =================================================================
// --- HELPER COMPONENTS (Defined at the top level for stability) ---
// =================================================================

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


// =================================================================
// --- THE MAIN APP COMPONENT ---
// =================================================================

const App = () => {
    // This state is owned by the App component and passed down to children.
    const [initialSessions, setInitialSessions] = useState({});

    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    {/* --- PUBLIC ROUTES --- */}
                    {/* These routes are accessible to everyone, logged in or not. */}
                    
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<UploadSection />} /> 

                    {/* --- PROTECTED LAYOUT ROUTE --- */}
                    {/* All routes nested inside here will first pass through ProtectedRoute. */}
                    <Route element={<ProtectedRoute />}>
                        
                        {/* If the user is authenticated, Outlet will render one of these routes */}
                        <Route
                            path="/workarea"
                            element={
                                <WorkArea
                                    initialSessions={initialSessions}
                                    setInitialSessions={setInitialSessions}
                                />
                            }
                        />
                        <Route path="/mindmap" element={<MindMap />} />

                        {/* You can add more protected routes here, e.g., /settings, /profile, etc. */}
                        
                    </Route>
                    
                    {/* --- CATCH-ALL (OPTIONAL) --- */}
                    {/* If a user types a URL that doesn't match any of the above, */}
                    {/* this will redirect them to the home page. */}
                    <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>
            </Router>
        </ThemeProvider>
    );
};

export default App;