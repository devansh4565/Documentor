import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { useMediaQuery } from './hooks/useMediaQuery';
import useFirebaseUser from './hooks/useFirebaseUser'; 
import UploadSection from './components/UploadSection';
import WorkArea from './components/WorkArea';
import MindMap from './components/MindMap';
import MobileChatList from './components/mobile/MobileChatList';
import MobileChatView from './components/mobile/MobileChatView';
import MobileFileList from './components/mobile/MobileFileList';
import MobilePdfView from './components/mobile/MobilePdfView';
import LoginPage from "./components/LoginPage";

import { UserContext, UserProvider } from './auth/UserContext';

// --- Helper Components ---
const LoadingSpinner = () => (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

// A component to protect routes
const ProtectedRoute = ({ children }) => {
    const { user, authReady } = useFirebaseUser();
    if (!authReady) return <LoadingSpinner />;
    return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
    const [initialSessions, setInitialSessions] = useState({});

    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    {/* Public route for logging in */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected routes */}
                    <Route 
                        path="/workarea"
                        element={
                            <ProtectedRoute>
                                <WorkArea
                                    initialSessions={initialSessions}
                                    setInitialSessions={setInitialSessions}
                                />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/mindmap"
                        element={
                            <ProtectedRoute>
                                <MindMap />
                            </ProtectedRoute>
                        }
                    />
                    
                    {/* Default route redirects based on login status */}
                    <Route path="*" element={<Navigate to="/workarea" replace />} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
};

export default App;