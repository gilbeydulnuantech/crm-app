// Base URL for the n8n webhook backend.
// NOTE: the ngrok free-tier URL rotates/expires — move this to a real
// domain (or a .env var, e.g. import.meta.env.VITE_API_BASE_URL) before shipping.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://tubular-silica-despite.ngrok-free.dev';

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
  // Per-user theme (Settings → Theme) — null means "use the app default".
  theme_header_color?: string | null;
  theme_main_color?: string | null;
  theme_accent_color?: string | null;
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

  // FormData needs the browser to set its own multipart Content-Type
  // (with boundary) — forcing application/json here would break uploads.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    // Every one of these webhooks is a live query/action, never a static
    // resource — a GET hitting the exact same URL twice (e.g. retrying the
    // same public_token) must never be served from the browser's HTTP
    // cache. n8n's webhook responses don't set Cache-Control themselves, so
    // without this a transient early failure can get cached and keep being
    // replayed on every retry even after the backend is fixed.
    cache: 'no-store',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
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

  const text = await res.text();
  if (!text) {
    // A 200 with a genuinely empty body never happens on a working path —
    // every webhook in this app responds with at least {success:true} via
    // its own Respond node. An empty body means the n8n execution errored
    // out and died before reaching any Respond node (most often a Postgres
    // node with no onError branch configured) — treat it as the failure it
    // is, instead of returning undefined and letting it surface downstream
    // as React Query's opaque "data is undefined" invariant error, which
    // hides what actually broke.
    throw new Error('Empty response from the server — the request likely failed before it could respond.');
  }
  return JSON.parse(text) as T;
}

export function decodeHtml(html: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = html || '';
  return txt.value;
}
