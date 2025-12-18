// API Configuration
// In production, set VITE_API_BASE_URL to your backend URL
// Examples:
//   - https://lifesync-api.railway.app
//   - https://lifesync-backend.onrender.com
// Do NOT include /api at the end - it's added automatically in fetch calls
// Do NOT include trailing slash

export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// Helper to build API URLs (optional utility)
export const apiUrl = (path) => `${API_BASE}${path}`
