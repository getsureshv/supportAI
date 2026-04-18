'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  team: string | null;
  role: string;
  profileComplete: boolean;
  picture: string | null;
}

export interface AuthConfig {
  googleClientId: string | null;
  demoLoginAvailable: boolean;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  config: AuthConfig | null;
  signInWithGoogle: (idToken: string) => Promise<SessionUser>;
  signInDemo: (email: string, name: string) => Promise<SessionUser>;
  updateProfile: (patch: { team?: string; role?: string; name?: string }) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.get<{ user: SessionUser }>('/api/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [configRes] = await Promise.all([
          apiClient.get<AuthConfig>('/api/auth/config'),
          refresh(),
        ]);
        setConfig(configRes.data);
      } catch (err) {
        console.error('Auth bootstrap failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    const res = await apiClient.post<{ user: SessionUser }>('/api/auth/google', { idToken });
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const signInDemo = useCallback(async (email: string, name: string) => {
    const res = await apiClient.post<{ user: SessionUser }>('/api/auth/demo', { email, name });
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const updateProfile = useCallback(
    async (patch: { team?: string; role?: string; name?: string }) => {
      const res = await apiClient.patch<{ user: SessionUser }>('/api/auth/me', patch);
      setUser(res.data.user);
      return res.data.user;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await apiClient.post('/api/auth/logout').catch(() => null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      config,
      signInWithGoogle,
      signInDemo,
      updateProfile,
      signOut,
      refresh,
    }),
    [user, loading, config, signInWithGoogle, signInDemo, updateProfile, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export { apiClient as authApiClient };
