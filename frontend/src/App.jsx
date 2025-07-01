import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { useMediaQuery } from './hooks/useMediaQuery';
import { UserProvider, UserContext } from './context/AppContext';

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
    const isDesktop = useMediaQuery('(min-width: 1024px)');

    return (
        <UserProvider>
            <ThemeProvider>
                <UserContext.Consumer>
                    {({ user, authLoading }) => {
                        if (authLoading) {
                            return <LoadingSpinner />;
                        }

                        return (
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
                                                            <Route path="/workarea" element={<WorkArea user={user} />} />
                                                            <Route path="/mindmap" element={<MindMap />} />
                                                            {/* Catch-all for logged-in desktop users */}
                                                            <Route path="*" element={<Navigate to="/workarea" replace />} />
                                                        </>
                                                    ) : (
                                                        // --- MOBILE PROTECTED ROUTES ---
                                                        <>
                                                            <Route path="/mobile/chats" element={<MobileChatList />} />
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
                        );
                    }}
                </UserContext.Consumer>
            </ThemeProvider>
        </UserProvider>
    );
};

export default App;
