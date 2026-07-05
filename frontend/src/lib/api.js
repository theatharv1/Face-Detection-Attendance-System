// Single source of truth for the backend base URL.
// Set VITE_API_URL in Vercel (Project → Settings → Environment Variables)
// to the deployed backend, e.g. https://your-backend.up.railway.app
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// When no backend is configured, the UI runs in a safe demo mode:
// controls render but network calls are skipped with a clear notice.
export const IS_DEMO = !API_URL;
