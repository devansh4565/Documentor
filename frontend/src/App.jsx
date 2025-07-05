// In src/App.jsx

// --- Your imports are mostly correct, but let's clean them up slightly ---
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import useFirebaseUser from './hooks/useFirebaseUser'; 
// In src/App.jsx

// ... other imports
import WorkArea from './components/WorkArea';
import MindMap from './components/MindMap';
import LoginPage from "./components/LoginPage";
import UploadSection from './components/UploadSection'; // <-- ADD THIS IMPORT

// Note: We don't need the mobile components here if they aren't used in this file.

// --- Helper Components (keep them at the top level) ---
const LoadingSpinner = () => (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

// ✅ CHANGE #1: ProtectedRoute now renders <Outlet /> instead of `children`
const ProtectedRoute = () => {
    const { user, authReady } = useFirebaseUser();

    if (!authReady) {
        return <LoadingSpinner />;
    }

    // If there's a user, render the child route via <Outlet />.
    // Otherwise, redirect to the login page.
    return user ? <Outlet /> : <Navigate to="/login" replace />;
};


// --- The Main App Component ---
const App = () => {
    const [initialSessions, setInitialSessions] = useState({});

    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    {/* --- PUBLIC ROUTES --- */}
                    <Route path="/login" element={<LoginPage />} />
                    {/* Assuming UploadSection is also public/a landing page */}
                    <Route path="/" element={<UploadSection />} /> 

                    {/* ✅ CHANGE #2: This is the stable Layout Route structure */}
                    <Route element={<ProtectedRoute />}>
                        {/* All routes nested inside here are now protected */}
                        {/* and WILL NOT remount on state changes. */}
                        
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
                    </Route>
                    
                    {/* Optional: A catch-all if you want to redirect any other typed URL */}
                    <Route path="*" element={<Navigate to="/" />} />

                </Routes>
            </Router>
        </ThemeProvider>
    );
};

export default App;