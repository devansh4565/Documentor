import React, { useContext ,  useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { useMediaQuery } from './hooks/useMediaQuery';

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

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(UserContext);
    if (loading) {
        return <LoadingSpinner />;
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const App = () => {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const [initialSessions, setInitialSessions] = useState({});

    return (
        <UserProvider>
            <ThemeProvider>
                <Router>
                    <Routes>
                        {/* Public routes visible when logged out */}
                        <Route path="/" element={<UploadSection />} />
                        <Route path="/login" element={<LoginPage />} />

                        {/* All protected routes are grouped here */}
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <Routes>
                                        {isDesktop ? (
                                            <>
                                                <Route path="/workarea" element={<WorkArea />} />
                                                <Route path="/mindmap" element={<MindMap />} />
                                                <Route path="*" element={<Navigate to="/workarea" replace />} />
                                            </>
                                        ) : (
                                            <>
                                                <Route path="/mobile/chats" element={<MobileChatList />} />
                                                <Route path="/mobile/chat/:sessionId" element={<MobileChatView />} />
                                                <Route path="/mobile/chat/:sessionId/files" element={<MobileFileList />} />
                                                <Route path="/mobile/chat/:sessionId/file/:fileId" element={<MobilePdfView />} />
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
        </UserProvider>
    );
};

export default App;
