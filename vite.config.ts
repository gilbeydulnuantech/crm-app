import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Content-Security-Policy for the production build only (the dev server needs inline scripts for hot reload).
// Scripts may only come from this site, so script injected through contact data (an <img onerror>, an inline
// <script>) cannot run or steal the login token. Inline styles stay allowed because the app and the rich-text
// editor use style attributes; images may come from any https host (company logos, avatars).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "font-src 'self' data: https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'crm-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
  };
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  server: {
    port: 5173,
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.io', '.ngrok.app'],
    proxy: {
      // Forwards the n8n-backed API to localhost:5678 so the frontend and
      // backend can share one public ngrok tunnel (the free tier only
      // grants one static domain) — the browser always calls same-origin
      // relative paths, and this proxy is what actually reaches n8n.
      '/webhook': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      },
    },
  },
});
