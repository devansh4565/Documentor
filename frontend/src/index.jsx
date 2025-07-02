import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { AuthProvider } from './auth/UserContext.jsx'; 
import { ThemeProvider } from './context/ThemeContext.jsx';

// Dynamically load runtime config before rendering app
const loadRuntimeConfig = async () => {
  try {
    const response = await fetch('/config.js');
    if (response.ok) {
      const scriptText = await response.text();
      // Evaluate the script to set window._env_
      // eslint-disable-next-line no-eval
      eval(scriptText);
    } else {
      console.warn('Could not load runtime config');
    }
  } catch (error) {
    console.error('Error loading runtime config:', error);
  }
};

loadRuntimeConfig().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        {/* ✅ Wrap the entire App with AuthProvider */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
});
