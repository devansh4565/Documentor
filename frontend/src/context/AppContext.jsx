import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // flag to avoid setting state on unmounted component

    const checkUserSession = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          withCredentials: true,
        });
        if (isMounted) {
          setUser(res.data);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    checkUserSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, authLoading }}>
      {children}
    </UserContext.Provider>
  );
};
