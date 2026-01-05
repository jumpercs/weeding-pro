import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { trpcClient } from '../lib/trpc';
import type { Profile, Subscription } from '../lib/database.types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isPro: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = React.useRef(true); // Track loading state for timeout
  const isConfigured = isSupabaseConfigured();
  
  // Keep ref in sync
  React.useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Get initial session with timeout
    const initAuth = async () => {
      try {
        // Check if user opted out of persistent session
        const sessionOnly = sessionStorage.getItem('eventgraph-session-only');
        
        // If session-only mode was set but we're in a new session (F5), clear auth
        // This is detected by checking if we have the flag but no sessionStorage marker
        if (sessionOnly === 'true') {
          // User doesn't want to be remembered - session storage persists through refresh
          // So this is fine, they'll stay logged in until browser close
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        console.log('Session restored:', session ? 'yes' : 'no');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (isMounted) setLoading(false);
      }
    };

    // Timeout to prevent infinite loading (15s is enough for slow connections)
    const timeout = setTimeout(() => {
      if (isMounted && loadingRef.current) {
        console.warn('Auth loading timeout - forcing complete');
        setLoading(false);
      }
    }, 15000);

    initAuth();

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setSubscription(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      authSubscription.unsubscribe();
    };
  }, [isConfigured]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch subscription
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (subscriptionData) {
        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      // Store preference for session persistence
      if (!rememberMe) {
        // If not remembering, we'll clear session on window close
        sessionStorage.setItem('eventgraph-session-only', 'true');
      } else {
        sessionStorage.removeItem('eventgraph-session-only');
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      // Notify backend about logout (for logging/audit)
      if (session?.access_token) {
        await trpcClient.auth.logout.mutate();
      }
    } catch (error) {
      console.error('Error notifying backend about logout:', error);
    }
    
    // Sign out from Supabase (local scope is the default and works on client)
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out from Supabase:', error);
    }
    
    // Clear local storage items
    localStorage.removeItem('eventgraph-auth');
    sessionStorage.removeItem('eventgraph-session-only');
    
    // Clear state
    setUser(null);
    setProfile(null);
    setSubscription(null);
    setSession(null);
  };

  const isPro = subscription?.plan !== 'free' && subscription?.status === 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        subscription,
        session,
        loading,
        isConfigured,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        isPro,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

