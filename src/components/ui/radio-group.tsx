"use client";

import { useId, type CSSProperties } from "react";
import { RadioGroup as RadixRadioGroup } from "radix-ui";
import { FieldError, FieldHint, controlBorder } from "./field-parts";
import { Spinner } from "./spinner";

export interface RadioOption {
  value: string;
  label: string;
  // Lets an option show itself differently, for example in its own font.
  style?: CSSProperties;
}

export interface RadioGroupProps {
  legend: string;
  options: RadioOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  // The option being saved: it shows a spinner and the whole group is disabled meanwhile.
  loadingValue?: string;
  hint?: string;
  error?: string;
  name?: string;
  disabled?: boolean;
}

export function RadioGroup({
  legend,
  options,
  value,
  onValueChange,
  loadingValue,
  hint,
  error,
  name,
  disabled,
}: RadioGroupProps) {
  const id = useId();
  const legendId = `${id}-legend`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const busy = loadingValue !== undefined;
  return (
    <div className="flex flex-col gap-1">
      <p id={legendId} className="font-medium">
        {legend}
      </p>
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      <RadixRadioGroup.Root
        value={value}
        onValueChange={onValueChange}
        name={name}
        disabled={disabled || busy}
        aria-labelledby={legendId}
        aria-describedby={describedBy}
        aria-busy={busy || undefined}
        className="flex flex-col"
      >
        {options.map((option) => {
          const itemId = `${id}-${option.value}`;
          return (
            <div key={option.value} className="flex min-h-11 items-center gap-3">
              <RadixRadioGroup.Item
                id={itemId}
                value={option.value}
                className={`flex size-6 shrink-0 items-center justify-center rounded-full bg-paper ${controlBorder} disabled:opacity-60`}
              >
                <RadixRadioGroup.Indicator className="size-3 rounded-full bg-ink" />
              </RadixRadioGroup.Item>
              <label htmlFor={itemId} style={option.style} className="flex-1 py-2">
                {option.label}
              </label>
              {loadingValue === option.value && <Spinner />}
            </div>
          );
        })}
      </RadixRadioGroup.Root>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
