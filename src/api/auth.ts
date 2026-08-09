import { apiFetch, CurrentUser } from './client';

interface AuthResponse {
  success?: boolean;
  token?: string;
  user?: CurrentUser;
  message?: string;
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>('/webhook/user-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
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
