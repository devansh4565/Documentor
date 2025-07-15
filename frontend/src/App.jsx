import React, { useState, Suspense } from 'react'; // ✅ 1. Import Suspense
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './auth/UserContext';
import SplineLoader from './components/SplineLoader'; // Your global loader

// ✅ 2. Change static imports to dynamic lazy-loaded imports
// CORRECT
const Homepage = React.lazy(() => import('./components/Homepage.jsx'));
const LoginPage = React.lazy(() => import('./components/LoginPage.jsx'));
const WorkArea = React.lazy(() => import('./components/WorkArea.jsx'));
const MindMap = React.lazy(() => import('./components/MindMap.jsx'));
const ProtectedRoute = React.lazy(() => import('./components/ProtectedRoute.jsx'));

// A fallback component to show while pages are loading
const FullPageLoader = () => (
  <div className="w-screen h-screen flex items-center justify-center bg-gray-900/50">
    <div className="w-48 h-48">
      <SplineLoader />
    </div>
  </div>
);


function App() {
  const [initialSessions, setInitialSessions] = useState({});

  return (
    <UserProvider>
      <ThemeProvider>
        <Router>
          {/* ✅ 3. Wrap your Routes in a Suspense component */}
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              {/* --- PUBLIC ROUTES --- */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Homepage />} />

              {/* --- PROTECTED ROUTES --- */}
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
          </Suspense>
        </Router>
      </ThemeProvider>
    </UserProvider>
  );
}

export default App;