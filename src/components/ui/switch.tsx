"use client";

import { useId } from "react";
import { Switch as RadixSwitch } from "radix-ui";
import { FieldError, FieldHint, controlBorder } from "./field-parts";

export interface SwitchProps {
  label: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

// On is shown by the knob sitting at the right, a filled track and the word "On", so it does not depend on colour.
export function Switch({ label, checked, onCheckedChange, hint, error, disabled }: SwitchProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center gap-3">
        <RadixSwitch.Root
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`flex h-7 w-12 shrink-0 items-center rounded-full bg-paper px-0.5 ${controlBorder} disabled:opacity-60 data-[state=checked]:bg-ink`}
        >
          <RadixSwitch.Thumb className="block size-5 rounded-full bg-ink transition-transform duration-100 data-[state=checked]:translate-x-5 data-[state=checked]:bg-paper motion-reduce:transition-none" />
        </RadixSwitch.Root>
        <label htmlFor={id} className="flex-1 py-2">
          {label}
        </label>
        <span aria-hidden="true" className="text-ink/75">
          {checked ? "On" : "Off"}
        </span>
      </div>
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
