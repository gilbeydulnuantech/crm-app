import { apiFetch, CurrentUser } from './client';

interface AuthResponse {
  success?: boolean;
  token?: string;
  user?: CurrentUser;
  message?: string;
  // Sign-up only: the account exists but an admin has to approve it before it can sign in.
  pending?: boolean;
}

export function login(email: string, password: string, rememberMe = false) {
  return apiFetch<AuthResponse>('/webhook/user-login', {
    method: 'POST',
    // remember_me → the backend issues a 7-day session instead of the default 24 hours.
    body: JSON.stringify({ email, password, remember_me: rememberMe }),
  });
}

export function signUp(name: string, email: string, password: string) {
  return apiFetch<AuthResponse>('/webhook/user-sign-up', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function verifySession(token: string) {
  return apiFetch<{ valid: boolean; user?: CurrentUser }>('/webhook/verify-session', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function logout(token: string) {
  return apiFetch<{ success: boolean }>('/webhook/logout', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
