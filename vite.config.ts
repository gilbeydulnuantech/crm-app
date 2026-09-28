import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
