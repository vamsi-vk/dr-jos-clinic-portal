export const ACCENTS = [
  { id: "teal", label: "Teal", swatch: "#0f766e" },
  { id: "sky", label: "Sky", swatch: "#0284c7" },
  { id: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { id: "emerald", label: "Emerald", swatch: "#059669" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
  { id: "amber", label: "Amber", swatch: "#d97706" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];
export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "miosalon-theme";
export const ACCENT_STORAGE_KEY = "miosalon-accent";
export const DEFAULT_ACCENT: AccentId = "teal";
export const DEFAULT_THEME: ThemeMode = "light";

export function isAccentId(value: string | null | undefined): value is AccentId {
  return ACCENTS.some((a) => a.id === value);
}
