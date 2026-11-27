import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** index.html applies the stored theme before the first paint; this keeps it in sync afterwards. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.add("[&_*]:!transition-none");
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
    requestAnimationFrame(() => root.classList.remove("[&_*]:!transition-none"));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
