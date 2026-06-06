import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

// Convenience hook: const { theme, toggleTheme } = useTheme();
export const useTheme = () => useContext(ThemeContext);

/**
 * Global day/night theme.
 * - Starts from the value saved in localStorage (default "light").
 * - Adds/removes the `dark` class on <html>, which re-points the color tokens
 *   (see index.css) so every page switches at once.
 * - Persists the choice so it survives reloads and applies on all pages.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
