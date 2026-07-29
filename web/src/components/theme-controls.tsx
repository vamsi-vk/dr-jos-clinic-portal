"use client";

import { ACCENTS } from "@/lib/theme";
import { useTheme } from "@/components/theme-provider";
import { IconMoon, IconSun } from "@/components/ui/icons";

export function ThemeControls({ compact = false }: { compact?: boolean }) {
  const { theme, accent, setAccent, toggleTheme } = useTheme();

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "rounded-lg border border-border bg-card p-1 shadow-xs"}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <div className="flex items-center gap-1 px-0.5" role="group" aria-label="Accent color">
        {ACCENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAccent(item.id)}
            title={item.label}
            aria-label={`${item.label} accent`}
            aria-pressed={accent === item.id}
            className={`h-4 w-4 rounded-full transition ring-offset-1 ring-offset-card ${
              accent === item.id ? "ring-2 ring-foreground/70 scale-110" : "opacity-80 hover:opacity-100"
            }`}
            style={{ backgroundColor: item.swatch }}
          />
        ))}
      </div>
    </div>
  );
}
