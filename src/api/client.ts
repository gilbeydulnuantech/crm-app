// Base URL for the n8n webhook backend.
// NOTE: the old ngrok free-tier URL rotates/expires — move this to a real
// domain (or a .env var, e.g. import.meta.env.VITE_API_BASE_URL) before shipping.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://cornball-empathy-bath.ngrok-free.dev';

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string) {
  localStorage.setItem('authToken', token);
}

export function clearAuthToken() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export function getCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

export function isAdmin(): boolean {
  return getCurrentUser()?.role === 'admin';
}

/**
 * Thin wrapper around fetch that adds the ngrok bypass header, bearer token,
 * and throws a normalized Error on non-2xx responses so React Query's
 * error state works out of the box.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `HTTP error ${res.status}`;
    try {
      const errBody = await res.json();
      message = errBody?.error || errBody?.message || message;
    } catch {
      // response wasn't JSON — keep the generic message
    }

    // Session/token errors should force a re-login, same as the old
    // fetchContactsFromN8n.js behavior.
    if (/session|token|invalid/i.test(message)) {
      clearAuthToken();
    }

    throw new Error(message);
  }

  // Some webhooks (e.g. DELETE-style actions) may return an empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function decodeHtml(html: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = html || '';
  return txt.value;
}
