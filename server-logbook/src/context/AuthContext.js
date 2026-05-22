import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

// Wraps any promise with a timeout so it never hangs forever
function withTimeout(promise, ms = 10000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Check your internet connection.')), ms)
  );
  return Promise.race([promise, timeout]);
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single()
      );
      if (!error && data) setProfile(data);
    } catch (e) {
      console.error('fetchProfile error:', e);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Hard 8-second fallback — always shows login even if offline
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    const init = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(), 7000
        );
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (e) {
        console.warn('Session check failed (offline?):', e.message);
      } finally {
        clearTimeout(timeout);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, fullName, role) => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
        })
      );
      return { data, error };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        10000
      );
      return { data, error };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
      );
      return { data, error };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  };

  const signOut = async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 5000);
    } catch (e) {
      console.warn('signOut error:', e);
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    setUser(null);
    setProfile(null);
  };

  const isAdmin  = profile?.role === 'admin';
  const isViewer = profile?.role === 'viewer';

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signOut, resetPassword,
      isAdmin, isViewer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
