import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Wrap any page that needs a logged-in user.
 *   <ProtectedRoute><Sell /></ProtectedRoute>
 *   <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
 *
 * If not logged in -> redirect to /login (remembering where we came from, so Login
 * can send the user back). If adminOnly and the user isn't an admin -> send home.
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // App shows a global loader while auth resolves, so this is just a safety net.
  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}
