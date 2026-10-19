"use client";

import { useId, type ReactNode } from "react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { Spinner } from "./spinner";
import { FieldError, FieldHint, controlBorder } from "./field-parts";

export interface CheckboxProps {
  label: ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  hint?: string;
  error?: string;
  name?: string;
  disabled?: boolean;
  // Shows a spinner beside the label and disables the checkbox while an async change runs.
  loading?: boolean;
}

export function Checkbox({ label, checked, onCheckedChange, hint, error, name, disabled, loading = false }: CheckboxProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center gap-3">
        <RadixCheckbox.Root
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange?.(value === true)}
          name={name}
          disabled={disabled || loading}
          aria-busy={loading || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`flex size-6 shrink-0 items-center justify-center rounded-sm bg-paper text-ink ${controlBorder} disabled:opacity-60 data-[state=checked]:bg-ink data-[state=checked]:text-paper`}
        >
          <RadixCheckbox.Indicator aria-hidden="true">✓</RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        <label htmlFor={id} className="flex-1 py-2">
          {label}
        </label>
        {loading && <Spinner />}
      </div>
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
