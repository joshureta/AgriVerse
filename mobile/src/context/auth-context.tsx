import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export type WorkerProfile = {
  id: string;
  full_name: string;
  role: 'farm_worker';
  worker_category: string | null;
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  profile: WorkerProfile | null;
  signIn: (email: string, password: string) => Promise<WorkerProfile>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function getWorkerProfile(): Promise<WorkerProfile> {
  const result = await apiRequest<{ profile: WorkerProfile }>('/api/auth/me');
  if (result.profile.role !== 'farm_worker') {
    throw new Error('This mobile application is only available to farm workers.');
  }
  return result.profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setProfile(await getWorkerProfile());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message || 'Unable to sign in.');

    try {
      const workerProfile = await getWorkerProfile();
      setSession(data.session);
      setProfile(workerProfile);
      return workerProfile;
    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ loading, session, profile, signIn, signOut }),
    [loading, profile, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
