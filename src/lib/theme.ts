export const THEMES = ["auto", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "auto";

const STORAGE_KEY = "theme";

function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

// Runs from an inline <script> in <head>, so the stored choice lands on <html>
// while the browser is still parsing — before any color is resolved. "auto" is
// already the server-rendered default, so only an explicit override is written.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;

const listeners = new Set<() => void>();

/** Client snapshot for `useSyncExternalStore`. */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Private browsing or a blocked storage partition — fall through.
  }
  return DEFAULT_THEME;
}

/** Server snapshot for `useSyncExternalStore`. */
export function readDefaultTheme(): Theme {
  return DEFAULT_THEME;
}

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keep other tabs in step with the choice made here.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Preference just won't survive the session.
  }
  for (const listener of listeners) listener();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}
