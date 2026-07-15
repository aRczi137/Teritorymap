import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import type { UserInfo } from './api';
import { getAuthState, getMe, getFirebaseToken, logoutSession } from './api';

const SESSION_KEY = 'session_token';

interface AuthContextValue {
  user: UserInfo | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const me = await getMe(sessionId);
        if (cancelled) return;

        const fbToken = await getFirebaseToken(sessionId);
        if (cancelled) return;

        await signInWithCustomToken(auth, fbToken);
        if (cancelled) return;

        setUser({ id: me.id, username: me.username, avatar: me.avatar });
      } catch {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async () => {
    const state = await getAuthState();
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    if (!clientId) {
      alert('Discord Client ID not configured. Set VITE_DISCORD_CLIENT_ID in .env');
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${state}`;
  }, []);

  const logout = useCallback(async () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      try { await logoutSession(sessionId); } catch { /* ignore */ }
    }
    localStorage.removeItem(SESSION_KEY);
    try { await signOut(auth); } catch { /* ignore */ }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
