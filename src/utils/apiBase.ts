/**
 * Base URL for all API calls.
 *
 * - Dev: leave VITE_API_URL unset — Vite proxies `/api` to the backend.
 * - Production behind a reverse proxy at a sub-path (e.g. AWS EC2 + nginx at
 *   `https://host/mandi`): build with `VITE_API_URL=/mandi/api`.
 * - Separate API origin: build with `VITE_API_URL=https://api.example.com/api`.
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api';
