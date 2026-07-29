"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isAccentId,
  type AccentId,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemeMode;
  accent: AccentId;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentId) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeMode, accent: AccentId) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.accent = accent;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const storedAccent = localStorage.getItem(ACCENT_STORAGE_KEY);
    const nextTheme =
      storedTheme === "light" || storedTheme === "dark" ? storedTheme : DEFAULT_THEME;
    const nextAccent = isAccentId(storedAccent) ? storedAccent : DEFAULT_ACCENT;
    setThemeState(nextTheme);
    setAccentState(nextAccent);
    applyTheme(nextTheme, nextAccent);
  }, []);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      setThemeState(next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
      applyTheme(next, accent);
    },
    [accent]
  );

  const setAccent = useCallback(
    (next: AccentId) => {
      setAccentState(next);
      localStorage.setItem(ACCENT_STORAGE_KEY, next);
      applyTheme(theme, next);
    },
    [theme]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, accent, setTheme, setAccent, toggleTheme }),
    [theme, accent, setTheme, setAccent, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
