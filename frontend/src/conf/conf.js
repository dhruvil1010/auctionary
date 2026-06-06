// Centralized config read from Vite env vars (must be prefixed VITE_).
// Defaults point at our local backend so the app works with zero setup.
const conf = {
  apiUrl: String(
    import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
  ),
  socketUrl: String(
    import.meta.env.VITE_SOCKET_URL || "http://localhost:8000"
  ),
};

export default conf;
