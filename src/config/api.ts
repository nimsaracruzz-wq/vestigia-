/**
 * API base URL — points to Railway in production, localhost:4000 in local dev.
 * Set VITE_API_URL in:
 *   - .env.local  → http://localhost:4000/api  (local dev)
 *   - Netlify env → https://your-app.railway.app/api  (production)
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "/api";
