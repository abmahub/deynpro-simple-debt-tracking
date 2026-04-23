import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto sign-out if the current user is blocked
  useEffect(() => {
    if (!session?.user) return;
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Block check post-login: prevent blocked users from staying signed in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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
