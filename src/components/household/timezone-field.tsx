"use client";

import { useId, useMemo, useState } from "react";
import { FieldError, FieldHint, controlBorder } from "@/components/ui/field-parts";
import { TextField } from "@/components/ui/text-field";
import { timezoneNames } from "./options";

export interface TimezoneFieldProps {
  value: string;
  onValueChange: (timezone: string) => void;
  error?: string;
  disabled?: boolean;
}

// A search box that narrows a list of timezone names; the chosen one always stays in the list.
export function TimezoneField({ value, onValueChange, error, disabled }: TimezoneFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [query, setQuery] = useState("");
  const all = useMemo(() => timezoneNames(value), [value]);
  const needle = query.trim().toLowerCase().replaceAll(" ", "_");
  const shown = all.filter((name) => name === value || name.toLowerCase().includes(needle));
  return (
    <div className="flex flex-col gap-1">
      <TextField
        label="Search timezones"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={disabled}
      />
      <label htmlFor={id} className="font-medium">
        Timezone
      </label>
      <FieldHint id={`${id}-hint`}>{shown.length === 1 ? "Only the chosen timezone matches." : `${shown.length} timezones.`}</FieldHint>
      <select
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[`${id}-hint`, error && errorId].filter(Boolean).join(" ")}
        className={`min-h-11 rounded-md bg-paper px-3 text-base text-ink ${controlBorder} disabled:opacity-60`}
      >
        {shown.map((name) => (
          <option key={name} value={name}>
            {name.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
