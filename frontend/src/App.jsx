import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './auth/UserContext';

// --- COMPONENT IMPORTS ---
import ProtectedRoute from './components/ProtectedRoute'; // ✅ ADD THIS IMPORT
import WorkArea from './components/WorkArea';
import LoginPage from './components/LoginPage';
import UploadSection from './components/UploadSection';
import MindMap from './components/MindMap';

// ❌ DELETE the const ProtectedRoute = () => ... and const LoadingSpinner = () => ... definitions from this file.

function App() {
  const [initialSessions, setInitialSessions] = useState({});

  return (
    <UserProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* --- PUBLIC ROUTES --- */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<UploadSection />} />

            {/* --- PROTECTED ROUTES --- */}
            {/* This now correctly uses the imported ProtectedRoute component */}
            <Route element={<ProtectedRoute />}>
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

            {/* --- CATCH-ALL REDIRECT --- */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </UserProvider>
  );
}

export default App;