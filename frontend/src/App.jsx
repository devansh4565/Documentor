import React, { useState } from 'react';
import { BrowserRouter as Router, useRoutes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './auth/UserContext'; // Assuming you still use this
import { getRoutes } from './routes.jsx'; // Change this from './routes' to './routes.jsx'
// ...

/**
 * A small component whose only job is to render the routes
 * returned by the useRoutes hook.
 */
const AppRoutes = () => {
    // This state MUST live here, so it can be passed to the route config
    const [initialSessions, setInitialSessions] = useState({});
    
    // Create the route configuration object
    const routeConfig = getRoutes(initialSessions, setInitialSessions);
    
    // The useRoutes hook takes the config and returns the element to render
    const element = useRoutes(routeConfig);
    
    return element;
};


/**
 * The main App component is now just for providers.
 */
const App = () => {
    return (
        <UserProvider>
            <ThemeProvider>
                <Router>
                    <AppRoutes />
                </Router>
            </ThemeProvider>
        </UserProvider>
    );
};

export default App;