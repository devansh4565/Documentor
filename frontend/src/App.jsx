// === START OF FINAL, COMBINED FILE: frontend/src/App.jsx ===

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import { ThemeProvider } from './context/ThemeContext';
import { useMediaQuery } from './hooks/useMediaQuery';

// --- Page Component Imports ---
import UploadSection from './components/UploadSection';
import WorkArea from './components/WorkArea';
import MindMap from './components/MindMap';
import MobileChatList from './components/mobile/MobileChatList';
import MobileChatView from './components/mobile/MobileChatView';
import MobileFileList from './components/mobile/MobileFileList';
import MobilePdfView from './components/mobile/MobilePdfView';
import LoginPage from "./components/LoginPage";



// --- Helper Components ---
const LoadingSpinner = () => (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

// This simple component protects routes from unauthenticated access.
const ProtectedRoute = ({ children, user }) => {
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const App = () => {
  
    // --- State is now managed directly inside App ---
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true); // Start loading
    const [initialSessions, setInitialSessions] = useState({});
    const [sessions, setSessions] = useState([]);
    const isDesktop = useMediaQuery('(min-width: 1024px)');

    // This effect checks the user's session once on app load.
    useEffect(() => {
        const checkUserSession = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/auth/me", { withCredentials: true });
                setUser(res.data);
            } catch (error) {
                console.log("No active user session.");
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
        };
        checkUserSession();
    }, []);

    // This effect fetches user-specific data AFTER the user is confirmed.
    useEffect(() => {
        if (user) {
            const fetchSessions = async () => {
                try {
                  const res = await axios.get("http://localhost:5000/api/chats", {
                    withCredentials: true
                  });
                  console.log("✅ Sessions fetched:", res.data);
                  setSessions(res.data);
                } catch (err) {
                  console.error("🚨 Could not fetch user sessions", err);
                }
              };
            fetchSessions();
        } else {
            setInitialSessions({}); // Clear sessions on logout
        }
    }, [user]);

    // Show a global loading spinner while checking auth status.
    if (authLoading) {
        return <LoadingSpinner />;
    }

    // --- Main Router Logic ---
    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    {/* Public routes visible when logged out */}
                    <Route path="/" element={!user ? <UploadSection /> : <Navigate to="/workarea" />} />
                    <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/workarea" />} />

                    {/* All protected routes are grouped here */}
                    <Route 
                        path="/*" // Match any route
                        element={
                            <ProtectedRoute user={user}>
                                <Routes>
                                    {isDesktop ? (
                                        // --- DESKTOP PROTECTED ROUTES ---
                                        <>
                                            <Route path="/workarea" element={<WorkArea user={user} initialSessions={initialSessions} setInitialSessions={setInitialSessions} />} />
                                            <Route path="/mindmap" element={<MindMap />} />
                                            {/* Catch-all for logged-in desktop users */}
                                            <Route path="*" element={<Navigate to="/workarea" replace />} />
                                        </>
                                    ) : (
                                        // --- MOBILE PROTECTED ROUTES ---
                                        <>
                                            <Route path="/mobile/chats" element={<MobileChatList initialSessions={initialSessions} setInitialSessions={setInitialSessions} />} />
                                            <Route path="/mobile/chat/:sessionId" element={<MobileChatView />} />
                                            <Route path="/mobile/chat/:sessionId/files" element={<MobileFileList />} />
                                            <Route path="/mobile/chat/:sessionId/file/:fileId" element={<MobilePdfView />} />
                                            {/* Catch-all for logged-in mobile users */}
                                            <Route path="*" element={<Navigate to="/mobile/chats" replace />} />
                                        </>
                                    )}
                                </Routes>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </ThemeProvider>
    );
};

export default App;
