import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './auth/UserContext';

// --- COMPONENT IMPORTS ---
import ProtectedRoute from './components/ProtectedRoute'; // Import the layout
import WorkArea from './components/WorkArea';
import LoginPage from './components/LoginPage';
import UploadSection from './components/UploadSection';
import MindMap from './components/MindMap';


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
            {/* The 'element' is the stable ProtectedRoute component. */}
            {/* All children are rendered via its <Outlet />. */}
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