"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Appearance, FontStyle, Theme } from "@/modules/user-preference/user-preference-schema";

export type AppearanceField = "theme" | "font";

const darkQuery = "(prefers-color-scheme: dark)";

function subscribeToDevice(onChange: () => void) {
  const query = window.matchMedia(darkQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

interface AppearanceState extends Appearance {
  // The mode in use: the chosen theme, or the device's mode until one is chosen.
  mode: Theme;
  // The field being saved and the value it is changing to.
  pending: { field: AppearanceField; value: string } | null;
  error: { field: AppearanceField; message: string } | null;
  setTheme: (theme: Theme) => Promise<void>;
  setFont: (font: FontStyle) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceState | null>(null);

export function useAppearance(): AppearanceState {
  const state = useContext(AppearanceContext);
  if (!state) throw new Error("useAppearance needs an AppearanceProvider");
  return state;
}

// Holds the signed-in user's theme and font. A change is saved first, then applied to <html>.
export function AppearanceProvider({ initial, children }: { initial: Appearance; children: ReactNode }) {
  const [appearance, setAppearance] = useState(initial);
  const [pending, setPending] = useState<AppearanceState["pending"]>(null);
  const deviceDark = useSyncExternalStore(
    subscribeToDevice,
    () => window.matchMedia(darkQuery).matches,
    () => false,
  );
  const [error, setError] = useState<AppearanceState["error"]>(null);

  const save = useCallback(async (field: AppearanceField, value: Theme | FontStyle) => {
    setPending({ field, value });
    setError(null);
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(field === "theme" ? { theme: value } : { fontStyle: value }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      document.documentElement.dataset[field === "theme" ? "theme" : "font"] = value;
      setAppearance((current) => ({ ...current, [field]: value }));
    } catch {
      setError({ field, message: `Could not save the ${field}. Try again.` });
    } finally {
      setPending(null);
    }
  }, []);

  const value = useMemo<AppearanceState>(
    () => ({
      ...appearance,
      mode: appearance.theme ?? (deviceDark ? "dark" : "light"),
      pending,
      error,
      setTheme: (theme) => save("theme", theme),
      setFont: (font) => save("font", font),
    }),
    [appearance, deviceDark, pending, error, save],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
