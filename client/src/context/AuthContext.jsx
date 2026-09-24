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

  const [mongoUser, setMongoUser] = useState(() => {
    try {
      const cached = localStorage.getItem('pollverse_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUser = useCallback(async () => {
    try {
      const authToken = await getToken();
      if (authToken) setToken(authToken);

      const res = await fetch(`${API_URL}/api/auth/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.warn('Sync server response:', errBody);
        return null;
      }

      const data = await res.json();
      if (data?.user) {
        setMongoUser(data.user);
        try {
          localStorage.setItem('pollverse_user', JSON.stringify(data.user));
        } catch (e) {
          console.warn('Could not save user to localStorage:', e);
        }
        return data.user;
      }
      return null;
    } catch (err) {
      console.warn('User sync error (continuing with Clerk session):', err);
      return null;
    }
  }, [getToken]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!isLoaded) return;

      if (isSignedIn) {
        await syncUser();
      } else {
        if (isMounted) {
          setMongoUser(null);
          setToken(null);
          try {
            localStorage.removeItem('pollverse_user');
          } catch {}
        }
      }
      if (isMounted) setLoading(false);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, syncUser]);

  const logout = async () => {
    try {
      localStorage.removeItem('pollverse_user');
    } catch {}
    setMongoUser(null);
    setToken(null);
    await signOut();
  };

  // Construct stable user object:
  // 1. If backend Mongo doc exists, use it (and enrich with Clerk name/avatar).
  // 2. If Clerk is signed in but Mongo doc is in-flight/offline, fall back directly
  //    to Clerk so the UI NEVER shows the user as unauthenticated or causes login loops!
  const user = mongoUser
    ? {
        ...mongoUser,
        name: mongoUser.name || clerkUser?.fullName || clerkUser?.firstName || clerkUser?.primaryEmailAddress?.emailAddress,
        email: mongoUser.email || clerkUser?.primaryEmailAddress?.emailAddress || '',
        imageUrl: clerkUser?.imageUrl,
      }
    : (isSignedIn && clerkUser)
    ? {
        id: clerkUser.id,
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress || 'User',
        credits: 0,
        isAdmin: Boolean(
          clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() === 'devanshupadhyay745@gmail.com'
        ),
        imageUrl: clerkUser.imageUrl,
      }
    : null;

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, refreshUser: syncUser, isSignedIn }}>
      {children}
    </AuthContext.Provider>
  );
};