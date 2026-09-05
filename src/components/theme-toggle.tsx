"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  THEMES,
  applyTheme,
  readDefaultTheme,
  readTheme,
  storeTheme,
  subscribeToTheme,
  type Theme,
} from "@/lib/theme";

const LABELS: Record<Theme, string> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, readDefaultTheme);

  // The head script already put this on <html> before the first paint. Doing it
  // again covers later changes, and Strict Mode's dev remount, which resets
  // <html> to the attributes React itself manages.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex gap-1 rounded-full border border-rule p-1"
    >
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          data-theme-value={option}
          className="theme-option"
          onClick={() => storeTheme(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
