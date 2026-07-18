import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

export const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || '';

// Bridges Clerk (identity/session) with our Mongo User doc (credits, stats).
// Clerk itself handles sign-in/sign-up UI — this context just reacts to
// Clerk's auth state and keeps our backend's copy of the user in sync.
export const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user: clerkUser } = useUser();

  const [mongoUser, setMongoUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUser = useCallback(async () => {
    try {
      const authToken = await getToken();
      console.log('🔑 Clerk token from getToken():', authToken ? `${authToken.slice(0, 20)}... (length ${authToken.length})` : authToken);
      setToken(authToken);

      const res = await fetch(`${API_URL}/api/auth/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('Sync failed, server said:', errBody);
        throw new Error('Failed to sync user with server');
      }

      const data = await res.json();
      setMongoUser(data.user);
      return data.user;
    } catch (err) {
      console.error('User sync error:', err);
      setMongoUser(null);
      return null;
    }
  }, [getToken]);

  useEffect(() => {
    const init = async () => {
      if (!isLoaded) return;

      if (isSignedIn) {
        await syncUser();
      } else {
        setMongoUser(null);
        setToken(null);
      }
      setLoading(false);
    };
    init();
  }, [isLoaded, isSignedIn, syncUser]);

  const logout = () => signOut();

  // Prefer the Mongo record (has credits) but fall back to Clerk's name
  // if our sync hasn't completed yet.
  const user = mongoUser
    ? { ...mongoUser, name: mongoUser.name || clerkUser?.firstName }
    : null;

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, refreshUser: syncUser }}>
      {children}
    </AuthContext.Provider>
  );
};