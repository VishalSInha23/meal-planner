"use client";

import { useId } from "react";
import { Select as RadixSelect } from "radix-ui";
import { FieldError, FieldHint, controlBorder } from "./field-parts";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  name?: string;
  disabled?: boolean;
}

export function Select({ label, options, value, onValueChange, placeholder, hint, error, name, disabled }: SelectProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      <RadixSelect.Root value={value} onValueChange={onValueChange} name={name} disabled={disabled}>
        <RadixSelect.Trigger
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`flex min-h-11 items-center justify-between gap-2 rounded-md bg-paper px-3 text-left text-base text-ink ${controlBorder} disabled:opacity-60`}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon aria-hidden="true">▾</RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className={`z-50 max-h-72 w-(--radix-select-trigger-width) overflow-hidden rounded-md bg-paper text-ink ${controlBorder}`}
          >
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 text-base data-highlighted:bg-ink/15 data-[state=checked]:font-semibold"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator aria-hidden="true">✓</RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
