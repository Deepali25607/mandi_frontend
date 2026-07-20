import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
// Sub-path deploys (e.g. AWS EC2 + nginx at https://host/mandi) build with
// VITE_BASE_PATH=/mandi/ so all asset/router/API URLs are prefixed. Default '/'.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to the NestJS backend so the frontend can call `/api/*`
    // with no CORS friction in dev.
    proxy: {
      '/api': {
        // 127.0.0.1 (not localhost): another app on this machine listens on
        // IPv6 [::]:5000, and Node resolves localhost to ::1 first — which
        // silently proxies API calls to the wrong server.
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
