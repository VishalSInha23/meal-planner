"use client";

import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { RadioGroup } from "@/components/ui/radio-group";
import { brand } from "@/config/generated/brand";
import type { FontStyle } from "@/modules/user-preference/user-preference-schema";
import { useAppearance } from "./appearance-provider";

const fontOptions = [
  { value: "serif", label: "Serif", style: { fontFamily: "var(--font-serif)" } },
  { value: "sans", label: "Sans-serif", style: { fontFamily: "var(--font-sans)" } },
];

export function AppearanceSettings() {
  const { mode, font, pending, error, setFont } = useAppearance();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-medium">Theme</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span>{mode === "dark" ? "Dark" : "Light"}</span>
        </div>
      </div>
      <RadioGroup
        legend="Font style"
        hint={`The default is ${brand.fonts.defaultStyle}.`}
        options={fontOptions}
        value={font}
        onValueChange={(value) => setFont(value as FontStyle)}
        loadingValue={pending?.field === "font" ? pending.value : undefined}
        error={error?.field === "font" ? error.message : undefined}
        disabled={pending !== null}
      />
    </div>
  );
}
