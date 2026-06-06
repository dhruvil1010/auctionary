import { useTheme } from "../context/ThemeContext.jsx";

// Day/night switch. Lives on the Home page (left side), but because it flips a
// class on <html>, the choice applies to every page and persists across reloads.
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
      className={`inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-page ${className}`}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      {/* label hides on small screens so the navbar stays tidy (icon-only there) */}
      <span className="hidden sm:inline">{isDark ? "Day mode" : "Night mode"}</span>
    </button>
  );
}
