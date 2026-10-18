"use client";

import { Moon, Sun } from "lucide-react";
import { useAppearance } from "@/components/appearance/appearance-provider";
import { IconButton } from "@/components/ui/icon-button";

// Switches between light and dark. The icon shows the mode it switches to.
export function ThemeToggle() {
  const { mode, pending, error, setTheme } = useAppearance();
  const next = mode === "dark" ? "light" : "dark";
  return (
    <div className="flex flex-col items-end gap-1">
      <IconButton label={`Switch to ${next} mode`} loading={pending?.field === "theme"} onClick={() => setTheme(next)}>
        {next === "light" ? <Sun size={20} /> : <Moon size={20} />}
      </IconButton>
      {error?.field === "theme" && (
        <p role="alert" className="text-base font-medium">
          <span aria-hidden="true">▲ </span>
          {error.message}
        </p>
      )}
    </div>
  );
}
