import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

// Convenience hook so components can do: const { user, login, logout } = useAuth();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until we've checked the token

  // On first load: if a token exists, fetch the current user to restore the session.
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/users/current-user")
      .then((res) => setUser(res.data.data))
      .catch(() => {
        // token invalid/expired -> clear it
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })
      .finally(() => setLoading(false));
  }, []);

  // Called by the Login/Register pages with the backend's response payload.
  // Risk #3: we store ONLY the short-lived access token. The refresh token now
  // lives solely in an httpOnly cookie the browser sends automatically — JS can't
  // read it, so XSS can't steal it. (removeItem below purges any legacy copy.)
  const login = ({ user: u, accessToken }) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.removeItem("refreshToken");
    setUser(u);
  };

  const logout = async () => {
    try {
      await api.post("/users/logout");
    } catch {
      // ignore network/401 errors on logout — we clear locally regardless
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
