import { Outlet } from "react-router-dom";
import { Navbar, Footer } from "./components";
import { useAuth } from "./context/AuthContext.jsx";

// App is the layout shell: Navbar + the active page (Outlet) + Footer.
// It waits for the auth check (token -> current user) to finish before rendering.
export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <p className="text-ink/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
