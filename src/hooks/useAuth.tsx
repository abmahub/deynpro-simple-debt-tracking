import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { isElectron } from '@/lib/electronDB';
import {
  cacheUserIdentity,
  clearCachedIdentity,
  getCachedUserId,
  getCachedEmail,
} from '@/lib/localAuth';

const USERNAME_DOMAIN = 'deynpro.local';

export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

export const emailToUsername = (email?: string | null) => {
  if (!email) return '';
  const [name] = email.split('@');
  return name || email;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // In Electron, build a synthetic offline session from the cached identity
  // so the app is usable without internet. Real Supabase session takes over
  // as soon as the network is back and signIn succeeds.
  const buildOfflineSession = (): Session | null => {
    if (!isElectron()) return null;
    const cachedId = getCachedUserId();
    if (!cachedId) return null;
    const email = getCachedEmail() || `${cachedId}@local`;
    return {
      access_token: 'offline',
      refresh_token: 'offline',
      expires_in: 0,
      token_type: 'bearer',
      user: {
        id: cachedId,
        email,
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      } as unknown as User,
    } as unknown as Session;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        cacheUserIdentity(session.user.id, session.user.email);
      }
      // Wipe React Query cache on sign-out so previous user's data doesn't leak
      if (event === 'SIGNED_OUT') {
        clearCachedIdentity();
        queryClient.clear();
      }
    });

    // Try Supabase first; if offline, fall back to cached identity (Electron only).
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          setSession(session);
          cacheUserIdentity(session.user.id, session.user.email);
        } else {
          setSession(buildOfflineSession());
        }
        setLoading(false);
      })
      .catch(() => {
        setSession(buildOfflineSession());
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  // Auto sign-out if the current user is blocked (skip when offline / Electron-cached)
  useEffect(() => {
    if (!session?.user) return;
    if (session.access_token === 'offline') return;
    let cancelled = false;
    const userId = session.user.id;
    const checkBlocked = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('blocked')
        .eq('user_id', userId)
        .maybeSingle();
      if (!cancelled && data?.blocked) {
        await supabase.auth.signOut();
      }
    };
    checkBlocked();
    // Poll frequently as a fallback
    const interval = setInterval(checkBlocked, 5000);

    // Realtime: react instantly when this user's row is updated
    const channel = supabase
      .channel(`user-block-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_roles', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          if (payload.new?.blocked) {
            supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const signIn = async (identifier: string, password: string) => {
    const trimmed = identifier.trim();
    // If user typed a real email (contains @), use it directly. Otherwise treat as username.
    const email = trimmed.includes('@') ? trimmed.toLowerCase() : usernameToEmail(trimmed);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      // Offline fallback (Electron only): if we have a cached identity for the
      // same email, accept the login locally so the user can keep working.
      if (isElectron() && getCachedEmail() === email && getCachedUserId()) {
        setSession(buildOfflineSession());
        return;
      }
      throw err;
    }

    // Block check post-login: prevent blocked users from staying signed in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      cacheUserIdentity(user.id, user.email);
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('blocked')
        .eq('user_id', user.id)
        .maybeSingle();
      if (roleRow?.blocked) {
        await supabase.auth.signOut();
        throw new Error('Your account has been blocked by the administrator.');
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
