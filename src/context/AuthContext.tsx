import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  CurrentUser,
  clearAuthToken,
  getAuthToken,
  getCurrentUser,
  setAuthToken,
  setCurrentUser,
} from '../api/client';
import { login as apiLogin, signUp as apiSignUp, verifySession, logout as apiLogout } from '../api/auth';

interface AuthContextValue {
  user: CurrentUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  // Resolves to a message when the account was created but still needs admin approval (no session is started).
  signUp: (name: string, email: string, password: string) => Promise<string | void>;
  logout: () => void;
  // Merges a partial update (e.g. freshly-saved theme colors) into the
  // signed-in user without a round trip — the backend is already the
  // source of truth by the time this is called (it's fed the mutation's
  // response), this just keeps context/localStorage in sync with it.
  updateLocalUser: (patch: Partial<CurrentUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(getCurrentUser());
  // Start true whenever a token exists — we need to verify it before
  // deciding whether to show the login screen or the app.
  const [isLoading, setIsLoading] = useState<boolean>(!!getAuthToken());

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    verifySession(token)
      .then((data) => {
        if (data.valid) {
          if (data.user) {
            setCurrentUser(data.user);
            setUser(data.user);
          }
        } else {
          clearAuthToken();
          setUser(null);
        }
      })
      .catch(() => {
        // Fail safe: don't trust a token we can't verify.
        clearAuthToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // apiFetch fires this when the backend rejects the session (it expires after
  // 24h) — without it the page keeps showing a signed-in user whose token is gone.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const data = await apiLogin(email, password, rememberMe);
    if (!data.token) {
      throw new Error(data.message || 'Invalid email or password.');
    }
    setAuthToken(data.token);
    if (data.user) {
      setCurrentUser(data.user);
      setUser(data.user);
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const data = await apiSignUp(name, email, password);

    if (data.success && data.pending) {
      return data.message || 'Account created. An administrator needs to approve it before you can sign in.';
    }

    if (data.token) {
      setAuthToken(data.token);
      if (data.user) {
        setCurrentUser(data.user);
        setUser(data.user);
      }
      return;
    }

    // Some backends don't auto-return a token on sign-up — fall back to
    // an explicit login call, same as the old handleAuthSubmit did.
    if (data.success) {
      await login(email, password);
      return;
    }

    throw new Error(data.message || 'Sign up failed.');
  }, [login]);

  const logout = useCallback(() => {
    // Best-effort: invalidate the session server-side so a leaked token
    // can't keep working after the user logs out. Never blocks on this —
    // a network hiccup shouldn't trap the user in a logged-in-looking state.
    const token = getAuthToken();
    if (token) {
      apiLogout(token).catch(() => {});
    }
    clearAuthToken();
    setUser(null);
  }, []);

  const updateLocalUser = useCallback((patch: Partial<CurrentUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setCurrentUser(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin: user?.role === 'admin', isLoading, login, signUp, logout, updateLocalUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
