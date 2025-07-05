import React, { createContext, useState, useEffect, useMemo } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Call backend /me endpoint to check if user is logged in via session cookie
    const fetchUser = async () => {
      try {
        const response = await fetch('https://documentor-backend-btiq.onrender.com/api/auth/me', {
          credentials: 'include', // important to send cookies
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // No login/logout functions here since login is handled by redirect to backend OAuth

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};
