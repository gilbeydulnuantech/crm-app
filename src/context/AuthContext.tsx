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
import { login as apiLogin, signUp as apiSignUp, verifySession } from '../api/auth';

interface AuthContextValue {
  user: CurrentUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
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
    clearAuthToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin: user?.role === 'admin', isLoading, login, signUp, logout }}
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
