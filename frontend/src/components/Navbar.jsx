import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Container from "./Container.jsx";
import Logo from "./Logo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <Container>
        <nav className="flex h-16 items-center gap-4">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          {/* Search (visual placeholder for now — wired up on the Home page) */}
          <div className="hidden flex-1 md:flex md:max-w-xl">
            <input
              type="text"
              placeholder="Search auctions..."
              className="w-full rounded-full border border-border bg-page px-4 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Night-mode toggle, just left of the Sell button (visible on every page). */}
            <ThemeToggle />

            <Link
              to="/sell"
              className="hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:inline-flex"
            >
              Sell
            </Link>

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="px-3 py-2 text-sm font-medium text-ink hover:text-brand"
                >
                  {user.username}
                </Link>
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    className="px-3 py-2 text-sm font-medium text-ink hover:text-brand"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-page"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-ink hover:text-brand"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </Container>
    </header>
  );
}
